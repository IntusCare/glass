import { join, resolve } from "node:path";
import { fs } from "zx";

const patterns = [
  "gstack/SKILL.md",
  "gstack/*/SKILL.md",
  "impeccable/plugin/skills/*/SKILL.md",
];
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const triggersBlock = /^triggers:.*\r?\n(?:[ \t]+.*\r?\n)*/m;

export function trimTriggers(source: string) {
  const frontmatter = frontmatterPattern.exec(source)?.[1];
  if (frontmatter === undefined) throw new Error("missing frontmatter");
  const parsed: unknown = Bun.YAML.parse(frontmatter);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    throw new Error("frontmatter must be a YAML mapping");
  if (!("triggers" in parsed)) return source;
  const trimmed = `${frontmatter}\n`.replace(triggersBlock, "");
  const result = source.replace(frontmatter, trimmed.replace(/\n$/, ""));
  if ("triggers" in (Bun.YAML.parse(trimmed) as object))
    throw new Error("could not remove triggers from frontmatter");
  return result;
}

export async function syncVendoredSkills(repo: string, write = false) {
  repo = resolve(repo);
  const paths: string[] = [];
  for (const pattern of patterns) {
    for await (const path of new Bun.Glob(pattern).scan(repo)) paths.push(path);
  }
  if (!paths.length) throw new Error(`No vendored skills found in ${repo}`);
  const stale: string[] = [];
  for (const path of paths.sort()) {
    const fullPath = join(repo, path);
    const source = await fs.readFile(fullPath, "utf8");
    let trimmed: string;
    try {
      trimmed = trimTriggers(source);
    } catch (error) {
      throw new Error(`${path}: ${(error as Error).message}`);
    }
    if (trimmed === source) continue;
    stale.push(path);
    if (write) await fs.writeFile(fullPath, trimmed);
  }
  if (stale.length && !write) {
    throw new Error(
      `Vendored skills declare \`triggers\`, which Devin reads as an invocation policy and hides the skill. Run \`bun run vendored-skills\`.\n${stale.join("\n")}`,
    );
  }
  return paths.length;
}

if (import.meta.main) {
  const count = await syncVendoredSkills(
    resolve(import.meta.dir, ".."),
    process.argv.includes("--write"),
  );
  console.log(`Validated ${count} vendored skills for Devin.`);
}
