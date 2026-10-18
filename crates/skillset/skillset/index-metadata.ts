#!/usr/bin/env bun
/**
 * Regenerate the metadata derived from the Picks under
 * crates/skillset/skillset: the plugin manifest's skills list, the
 * .devin/skills discovery symlinks, and the README's Model-invoked block.
 * Run with --check to report stale outputs without writing.
 */

import { dirname, join, resolve } from "node:path";
import { fs } from "zx";

export const repoRoot = resolve(import.meta.dir, "../../..");
export const picksRoot = "crates/skillset/skillset";

const readmeStart = "<!-- picks:start -->";
const readmeEnd = "<!-- picks:end -->";

export type Pick = {
  category: string;
  name: string;
  dir: string;
  description: string;
};

function parseFrontmatter(source: string): Record<string, unknown> {
  const block = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!block) return {};
  try {
    const parsed: unknown = Bun.YAML.parse(block);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function findPicks(repo: string): Promise<Pick[]> {
  const picks: Pick[] = [];
  for await (const path of new Bun.Glob(`${picksRoot}/*/*/SKILL.md`).scan(
    repo,
  )) {
    const dir = dirname(path);
    const category = dir.split("/").at(-2) ?? "";
    const folder = dir.split("/").at(-1) ?? "";
    const expected = `${category}-${folder}`;
    const frontmatter = parseFrontmatter(
      await fs.readFile(join(repo, path), "utf8"),
    );
    const name = String(frontmatter.name ?? expected);
    if (name !== expected) {
      throw new Error(
        `frontmatter name "${name}" in ${dir} does not match "${expected}"`,
      );
    }
    const existing = picks.find((pick) => pick.name === name);
    if (existing) {
      throw new Error(
        `duplicate pick name "${name}" in ${existing.dir} and ${dir}`,
      );
    }
    picks.push({
      category,
      name,
      dir,
      description: String(frontmatter.description ?? ""),
    });
  }
  return picks.sort((a, b) => a.dir.localeCompare(b.dir));
}

export function firstSentence(description: string): string {
  const end = description.indexOf(". ");
  return end === -1 ? description : description.slice(0, end + 1);
}

function readmeBlock(picks: Pick[]): string {
  const groups = new Map<string, Pick[]>();
  for (const pick of picks) {
    const group = groups.get(pick.category) ?? [];
    group.push(pick);
    groups.set(pick.category, group);
  }
  return [...groups]
    .map(
      ([category, group]) =>
        `#### ${category}\n\n${group
          .map(
            (pick) =>
              `- **[${pick.name}](./${pick.dir}/SKILL.md)**: ${firstSentence(pick.description)}`,
          )
          .join("\n")}`,
    )
    .join("\n\n");
}

function renderReadme(readme: string, picks: Pick[]): string {
  const start = readme.indexOf(readmeStart);
  const end = readme.indexOf(readmeEnd);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `README.md is missing the ${readmeStart} / ${readmeEnd} markers`,
    );
  }
  return `${readme.slice(0, start + readmeStart.length)}\n\n${readmeBlock(picks)}\n\n${readme.slice(end)}`;
}

async function syncSkillLinks(
  repo: string,
  picks: Pick[],
  check: boolean,
  stale: string[],
): Promise<void> {
  const linksDir = join(repo, ".devin/skills");
  await fs.ensureDir(linksDir);
  const expected = new Map(
    picks.map((pick) => [pick.name, `../../${pick.dir}`]),
  );
  for (const entry of await fs.readdir(linksDir, { withFileTypes: true })) {
    const link = join(linksDir, entry.name);
    if (!entry.isSymbolicLink()) {
      throw new Error(`${link} is not a symlink; refusing to touch it`);
    }
    const target = expected.get(entry.name);
    const current = await fs.readlink(link);
    if (target === undefined) {
      stale.push(`.devin/skills/${entry.name}`);
      if (!check) await fs.remove(link);
    } else if (current !== target) {
      stale.push(`.devin/skills/${entry.name}`);
      if (!check) {
        await fs.remove(link);
        await fs.symlink(target, link);
      }
    }
    expected.delete(entry.name);
  }
  for (const [name, target] of expected) {
    stale.push(`.devin/skills/${name}`);
    if (!check) await fs.symlink(target, join(linksDir, name));
  }
}

async function syncJsonFile(
  repo: string,
  path: string,
  render: (json: Record<string, unknown>) => void,
  check: boolean,
  stale: string[],
): Promise<void> {
  const file = join(repo, path);
  const json = (await fs.readJson(file)) as Record<string, unknown>;
  render(json);
  const next = `${JSON.stringify(json, null, 2)}\n`;
  if ((await fs.readFile(file, "utf8")) !== next) {
    stale.push(path);
    if (!check) await fs.writeFile(file, next);
  }
}

export async function indexMetadata(
  repo: string,
  opts: { check: boolean },
): Promise<string[]> {
  const picks = await findPicks(repo);
  const stale: string[] = [];

  await syncJsonFile(
    repo,
    ".claude-plugin/plugin.json",
    (json) => {
      json.skills = picks.map((pick) => `./${pick.dir}`);
    },
    opts.check,
    stale,
  );

  await syncSkillLinks(repo, picks, opts.check, stale);

  const readmePath = "README.md";
  const readme = await fs.readFile(join(repo, readmePath), "utf8");
  const nextReadme = renderReadme(readme, picks);
  if (nextReadme !== readme) {
    stale.push(readmePath);
    if (!opts.check) await fs.writeFile(join(repo, readmePath), nextReadme);
  }

  return stale;
}

if (import.meta.main) {
  const check = process.argv.includes("--check");
  const stale = await indexMetadata(repoRoot, { check });
  if (stale.length === 0) {
    console.log("metadata up to date");
  } else {
    for (const path of stale) console.log(path);
    if (check) process.exit(1);
  }
}
