import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fs } from "zx";

export const toolingRoot = "crates/skillset/skillset/skillset";
export const outputRoot = `${toolingRoot}/skillset`;
export const statePath = `${toolingRoot}/extracted.json`;
export const manifestPath = ".claude-plugin/plugin.json";

export type GeneratedFile =
  | { kind: "file"; content: Buffer; mode: number }
  | { kind: "link"; target: string };
type Stamp =
  | { kind: "file"; hash: string; mode: number }
  | { kind: "link"; target: string };
type Inventory = {
  version: 1;
  files: Record<string, Stamp>;
  skills: string[];
  agents: string[];
};

export function textFile(content: string, mode = 0o644): GeneratedFile {
  return { kind: "file", content: Buffer.from(content), mode };
}

export function safePath(path: string) {
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Unsafe path: ${path}`);
  }
  return path;
}

// Check every parent before accessing a destination, including dangling links.
export async function inspect(
  repo: string,
  path: string,
): Promise<GeneratedFile | undefined> {
  safePath(path);
  const parts = path.split("/");
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(0, i).join("/");
    const stat = await fs.lstat(join(repo, parent), { throwIfNoEntry: false });
    if (stat && !stat.isDirectory())
      throw new Error(`Refusing non-directory parent: ${parent}`);
  }
  const full = join(repo, path);
  const stat = await fs.lstat(full, { throwIfNoEntry: false });
  if (!stat) return;
  if (stat.isSymbolicLink())
    return { kind: "link", target: await fs.readlink(full) };
  if (!stat.isFile()) throw new Error(`Refusing non-file output: ${path}`);
  return {
    kind: "file",
    content: await fs.readFile(full),
    mode: stat.mode & 0o777,
  };
}

function stamp(file: GeneratedFile): Stamp {
  return file.kind === "link"
    ? file
    : {
        kind: "file",
        hash: createHash("sha256").update(file.content).digest("hex"),
        mode: file.mode,
      };
}

function equal(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function ownedPath(path: string, allowPreviousLayout = false) {
  safePath(path);
  return (
    path !== statePath &&
    ((allowPreviousLayout ? [outputRoot, toolingRoot] : [outputRoot]).some(
      (root) =>
        new RegExp(
          `^${root}/(?:infra/[^/]+/.+|[a-z0-9-]+/[a-z0-9-]+/.+)$`,
        ).test(path),
    ) ||
      /^\.devin\/skills\/[a-z0-9-]+$/.test(path) ||
      path === ".claude/skills" ||
      path === ".agents/skills")
  );
}

export async function syncGenerated(
  repo: string,
  files: Map<string, GeneratedFile>,
  skills: string[],
  agents: string[],
  write: boolean,
  legacy: Map<string, GeneratedFile> = new Map(),
) {
  const stored = await inspect(repo, statePath);
  let previous: Inventory = { version: 1, files: {}, skills: [], agents: [] };
  if (stored) {
    if (stored.kind !== "file")
      throw new Error(`Refusing symlink: ${statePath}`);
    const parsed = JSON.parse(stored.content.toString());
    if (
      parsed.version !== 1 ||
      !parsed.files ||
      !Array.isArray(parsed.skills) ||
      !Array.isArray(parsed.agents)
    )
      throw new Error(`Invalid generated inventory: ${statePath}`);
    previous = parsed;
    for (const path of Object.keys(previous.files)) {
      if (!ownedPath(path, true))
        throw new Error(`Invalid owned path: ${path}`);
    }
  }
  const manifestFile = await inspect(repo, manifestPath);
  if (manifestFile?.kind !== "file")
    throw new Error(`Missing regular file: ${manifestPath}`);
  const manifest = JSON.parse(manifestFile.content.toString());
  if (
    stored &&
    (!equal(manifest.skills, previous.skills) ||
      !equal(manifest.agents ?? [], previous.agents))
  ) {
    throw new Error(
      "Manually edited generated manifest entries; restore skills/agents before extracting",
    );
  }
  const before = new Map<string, GeneratedFile | undefined>();
  const changes = new Map<string, GeneratedFile | undefined>();
  for (const path of new Set([
    ...Object.keys(previous.files),
    ...legacy.keys(),
    ...files.keys(),
  ])) {
    const current = await inspect(repo, path);
    before.set(path, current);
    const oldFile = legacy.get(path);
    const expected =
      previous.files[path] ?? (oldFile ? stamp(oldFile) : undefined);
    if (expected && current && !equal(stamp(current), expected)) {
      throw new Error(`Manually edited generated file: ${path}`);
    }
    const next = files.get(path);
    if (!expected && current) {
      throw new Error(`Refusing to overwrite unrelated file: ${path}`);
    }
    if (!equal(current && stamp(current), next && stamp(next)))
      changes.set(path, next);
  }
  const inventory: Inventory = { version: 1, files: {}, skills, agents };
  for (const [path, file] of [...files].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    if (!ownedPath(path)) throw new Error(`Invalid generated path: ${path}`);
    inventory.files[path] = stamp(file);
  }
  const nextManifest = textFile(
    `${JSON.stringify({ ...manifest, skills, agents }, null, 2)}\n`,
  );
  const nextState = textFile(`${JSON.stringify(inventory, null, 2)}\n`);
  before.set(manifestPath, manifestFile);
  before.set(statePath, stored);
  if (!equal(stamp(manifestFile), stamp(nextManifest)))
    changes.set(manifestPath, nextManifest);
  if (!stored || !equal(stamp(stored), stamp(nextState)))
    changes.set(statePath, nextState);
  if (!write && changes.size) {
    throw new Error(
      `Generated skillset is stale. Run \`bun run extract-skills\`.\n${[
        ...changes.keys(),
      ].join("\n")}`,
    );
  }
  if (write) {
    // Recheck after planning so a concurrent editor cannot be silently overwritten.
    for (const [path, original] of before) {
      const current = await inspect(repo, path);
      if (!equal(current && stamp(current), original && stamp(original)))
        throw new Error(`Changed during extraction: ${path}`);
    }
    for (const [path, file] of changes) {
      const full = join(repo, path);
      if (!file) await fs.unlink(full);
      else {
        await fs.ensureDir(dirname(full));
        if (before.get(path)?.kind === "link") await fs.unlink(full);
        if (file.kind === "link") await fs.symlink(file.target, full, "dir");
        else {
          await fs.writeFile(full, file.content);
          await fs.chmod(full, file.mode);
        }
      }
    }
  }
  return changes.size;
}
