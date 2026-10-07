import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";
import { fs } from "zx";

const buckets = [
  "engineering",
  "productivity",
  "in-progress",
  "misc",
  "deprecated",
];
const metadataSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  "disable-model-invocation": z.boolean().optional(),
  "user-invocable": z.boolean().optional(),
  triggers: z.array(z.string()).optional(),
});
const codexSchema = z.object({
  policy: z
    .object({ allow_implicit_invocation: z.boolean().optional() })
    .optional(),
});

async function discoverSkills(repo: string) {
  const skills = new Map<string, string>();
  for (const bucket of buckets) {
    for await (const path of new Bun.Glob(`skills/${bucket}/*/SKILL.md`).scan(
      repo,
    )) {
      const source = await fs.readFile(join(repo, path), "utf8");
      const frontmatter = source.match(
        /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
      )?.[1];
      if (!frontmatter) throw new Error(`Missing frontmatter: ${path}`);
      const metadata = metadataSchema.parse(Bun.YAML.parse(frontmatter));
      const name = basename(dirname(path));
      if (metadata.name !== name)
        throw new Error(`Skill name must match its directory: ${path}`);
      if (skills.has(name)) throw new Error(`Duplicate skill name: ${name}`);
      const codex = codexSchema.parse(
        Bun.YAML.parse(
          await fs.readFile(
            join(repo, dirname(path), "agents/openai.yaml"),
            "utf8",
          ),
        ),
      );
      if (
        metadata["disable-model-invocation"] ||
        metadata["user-invocable"] === false ||
        (metadata.triggers &&
          (!metadata.triggers.includes("model") ||
            !metadata.triggers.includes("user"))) ||
        codex.policy?.allow_implicit_invocation === false
      ) {
        throw new Error(`Skill must allow user and model invocation: ${path}`);
      }
      skills.set(name, `../../skills/${bucket}/${name}`);
    }
  }
  if (!skills.size) throw new Error(`No skills found in ${repo}`);
  return skills;
}

function isManagedLink(name: string, target: string) {
  return buckets.some((bucket) => target === `../../skills/${bucket}/${name}`);
}

export async function syncLocalSkills(repo: string, write = false) {
  repo = resolve(repo);
  const skills = await discoverSkills(repo);
  const directories = [".devin", ".devin/skills", ".agents", ".claude"];
  for (const directory of directories) {
    const path = join(repo, directory);
    const stat = await fs.lstat(path, { throwIfNoEntry: false });
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) {
      throw new Error(
        `Refusing to write through non-directory or symlink: ${path}`,
      );
    }
  }

  const desired = new Map<string, string>([
    [".agents/skills", "../.devin/skills"],
    [".claude/skills", "../.devin/skills"],
    ...Array.from(skills, ([name, target]): [string, string] => [
      `.devin/skills/${name}`,
      target,
    ]),
  ]);
  const localDirectory = join(repo, ".devin/skills");
  const existing: string[] = (await fs.pathExists(localDirectory))
    ? await fs.readdir(localDirectory)
    : [];
  const paths = new Set([
    ...desired.keys(),
    ...existing.map((name) => `.devin/skills/${name}`),
  ]);
  const changes: {
    path: string;
    target: string | undefined;
    exists: boolean;
  }[] = [];
  for (const path of paths) {
    const fullPath = join(repo, path);
    const target = desired.get(path);
    const stat = await fs.lstat(fullPath, { throwIfNoEntry: false });
    if (stat) {
      if (!stat.isSymbolicLink())
        throw new Error(`Refusing to replace non-symlink: ${path}`);
      const current = await fs.readlink(fullPath);
      if (current === target) continue;
      if (
        !path.startsWith(".devin/skills/") ||
        !isManagedLink(basename(path), current)
      ) {
        throw new Error(`Refusing to replace unrelated symlink: ${path}`);
      }
    }
    changes.push({ path: fullPath, target, exists: Boolean(stat) });
  }
  if (changes.length && !write) {
    throw new Error(
      `Local skill links are missing or stale. Run \`bun run link-skills\`.\n${changes
        .map(({ path }) => path)
        .join("\n")}`,
    );
  }
  if (write) {
    for (const directory of directories)
      await fs.ensureDir(join(repo, directory));
    for (const { path, target, exists } of changes) {
      if (exists) await fs.unlink(path);
      if (target) await fs.symlink(target, path, "dir");
    }
  }
  return skills.size;
}

if (import.meta.main) {
  const count = await syncLocalSkills(
    resolve(import.meta.dir, ".."),
    process.argv.includes("--write"),
  );
  console.log(
    `Validated ${count} local skills for Devin, Claude Code, and Codex.`,
  );
}
