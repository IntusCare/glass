import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { z } from "zod";

const nonempty = z.string().trim().min(1);
const name = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(64);
const metadataSchema = z.strictObject({
  name,
  displayName: nonempty,
  version: nonempty,
  description: nonempty,
  author: z.strictObject({
    name: nonempty,
    email: z.email().optional(),
    url: z.url().optional(),
  }),
  homepage: z.url(),
  repository: z.url(),
  license: nonempty.optional(),
  keywords: z.array(nonempty),
  category: nonempty,
  skillsDirectory: z.string().min(1),
});
const skillSchema = z.object({ name, description: nonempty });

function checkedPath(
  repo: string,
  path: string,
  kind: string,
  type: "file" | "directory",
  allowMissing = false,
) {
  const segments = path.slice(2).split("/");
  if (
    !path.startsWith("./") ||
    segments.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        part === "~" ||
        part !== part.trim() ||
        /[\\:*?"<>|]/.test(part) ||
        [...part].some((char) => char.charCodeAt(0) < 32),
    )
  ) {
    throw new Error(`Invalid ${kind} path: ${path}`);
  }
  let current = repo;
  for (const [index, segment] of segments.entries()) {
    current = join(current, segment);
    const stat = lstatSync(current, { throwIfNoEntry: false });
    if (!stat && allowMissing) return join(repo, ...segments);
    const directory = index < segments.length - 1 || type === "directory";
    if (
      !stat ||
      stat.isSymbolicLink() ||
      (directory ? !stat.isDirectory() : !stat.isFile()) ||
      (kind === "output" && stat.isFile() && stat.nlink > 1)
    ) {
      throw new Error(
        `Invalid ${kind} path: ${path} (expected a real ${directory ? "directory" : "file"})`,
      );
    }
  }
  return current;
}

function discoverSkills(repo: string, directory: string) {
  const skills: { name: string; path: string }[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = checkedPath(
      repo,
      `./${relative(repo, join(directory, entry.name)).split(sep).join("/")}`,
      "skills",
      entry.isDirectory() && entry.name !== "SKILL.md" ? "directory" : "file",
    );
    if (entry.isDirectory()) skills.push(...discoverSkills(repo, path));
    if (entry.isFile() && entry.name === "SKILL.md") {
      const source = readFileSync(path, "utf8");
      const frontmatter = source.match(
        /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
      )?.[1];
      if (!frontmatter) throw new Error(`Missing skill frontmatter: ${path}`);
      const metadata = skillSchema.parse(Bun.YAML.parse(frontmatter));
      skills.push({
        name: metadata.name,
        path: `./${relative(repo, directory).split(sep).join("/")}`,
      });
    }
  }
  return skills;
}

export function generatePluginMetadata(repo: string, check = false) {
  repo = realpathSync(repo);
  const configPath = checkedPath(
    repo,
    "./crates/skillset/skillset/plugin.json",
    "configuration",
    "file",
  );
  const config = metadataSchema.parse(
    JSON.parse(readFileSync(configPath, "utf8")),
  );
  const ownedSkills = "./crates/skillset/skillset/skills";
  if (
    config.skillsDirectory !== ownedSkills &&
    !config.skillsDirectory.startsWith(`${ownedSkills}/`)
  ) {
    throw new Error(
      `Invalid skills path: ${config.skillsDirectory} (must be inside ${ownedSkills})`,
    );
  }
  const directory = checkedPath(
    repo,
    config.skillsDirectory,
    "skills",
    "directory",
  );
  const discovered = discoverSkills(repo, directory);
  const names = new Map<string, string>();
  for (const skill of discovered) {
    const previous = names.get(skill.name);
    if (previous) {
      throw new Error(
        `Duplicate skill name: ${skill.name} (${previous}, ${skill.path})`,
      );
    }
    names.set(skill.name, skill.path);
  }
  const skills = discovered.map((skill) => skill.path).sort();
  const { displayName, category, skillsDirectory: _, ...metadata } = config;
  const manifest = { ...metadata, skills };
  const files = new Map<string, unknown>([
    [".claude-plugin/plugin.json", { ...manifest, displayName }],
    [
      ".claude-plugin/marketplace.json",
      {
        name: config.name,
        owner: config.author,
        description: config.description,
        plugins: [
          {
            name: config.name,
            source: "./",
            description: config.description,
            category,
            keywords: config.keywords,
          },
        ],
      },
    ],
    [
      ".devin-plugin/plugin.json",
      {
        ...manifest,
        author: {
          name: config.author.name,
          ...(config.author.email && { email: config.author.email }),
        },
      },
    ],
    [
      ".codex-plugin/plugin.json",
      {
        ...manifest,
        interface: {
          displayName,
          shortDescription: config.description,
          developerName: config.author.name,
          category,
        },
      },
    ],
    [
      ".agents/plugins/marketplace.json",
      {
        name: config.name,
        interface: { displayName },
        plugins: [
          {
            name: config.name,
            source: { source: "local", path: "./" },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
            category,
          },
        ],
      },
    ],
  ]);
  const rendered = Array.from(files, ([path, contents]) => ({
    destination: checkedPath(repo, `./${path}`, "output", "file", true),
    contents: `${JSON.stringify(contents, null, 2)}\n`,
  }));
  const changed = rendered.filter(
    ({ destination, contents }) =>
      !existsSync(destination) ||
      readFileSync(destination, "utf8") !== contents,
  );
  if (check && changed.length) {
    throw new Error(
      `Generated plugin metadata is stale:\n${changed.map(({ destination }) => relative(repo, destination)).join("\n")}\nRun bun run generate-plugin.`,
    );
  }
  for (const { destination, contents } of changed) {
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, contents);
  }
  return { skills: skills.length, files: files.size };
}

if (import.meta.main) {
  try {
    if (process.argv.slice(2).some((arg) => arg !== "--check")) {
      throw new Error("Usage: bun generate-plugin.ts [--check]");
    }
    const check = process.argv.includes("--check");
    const result = generatePluginMetadata(
      resolve(import.meta.dir, "../../.."),
      check,
    );
    console.log(
      `${check ? "Checked" : "Generated"} ${result.files} plugin metadata files for ${result.skills} skills.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
