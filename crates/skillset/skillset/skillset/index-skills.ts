#!/usr/bin/env bun
/**
 * Index all the skills in crates/skillset/ except crates/skillset/skillset and patch skills.csv removing removed skills and adding new skills. skills.csv should contain the following columns:
 * - status: new/deleted/picked
 * - path: path to the skill relative to the crates/skillset directory.
 * - category: The category of the skill
 * - name: the name of the skill
 & - new_category: the new category of the skill
 * - new_name: the new name of the skill if it has been renamed
 * - description: the skill's description.
 * Keep the csv sorted by path
 */

import { basename, dirname, join, relative, resolve } from "node:path";
import Papa from "papaparse";
import { fs } from "zx";

export const suitesRoot = "crates/skillset";
export const csvPath = "crates/skillset/skillset/skillset/skills.csv";
export const columns = [
  "status",
  "path",
  "category",
  "name",
  "new_category",
  "new_name",
  "description",
  "url",
] as const;
type Column = (typeof columns)[number];
export type Row = Record<Column, string>;

const scriptStatuses = ["new", "deleted"] as const;
const humanStatuses = ["picked", "skipped"] as const;
const statuses: readonly string[] = [...scriptStatuses, ...humanStatuses];
const excludedSuites = new Set(["skillset"]);
const excludedSegments = new Set(["node_modules", "test", "tests", "fixtures"]);

type Skill = {
  suite: string;
  path: string;
  category: string;
  name: string;
  description: string;
  frontmatter: Record<string, unknown>;
};

const urlRules: Record<
  string,
  (repo: string, skill: Skill) => Promise<string> | string
> = {
  glass: async (repo, { category, name }) =>
    (await fs.pathExists(join(repo, "docs", category, `${name}.md`)))
      ? `https://github.com/intuscare/glass/blob/main/docs/${category}/${name}.md`
      : "",
  mattpocock: async (repo, { suite, category, name }) =>
    (await fs.pathExists(
      join(repo, suitesRoot, suite, "docs", category, `${name}.md`),
    ))
      ? `https://aihero.dev/skills-${name}`
      : "",
  impeccable: () => "https://impeccable.style",
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

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function discoverSkills(repo: string): Promise<Skill[]> {
  const root = join(repo, suitesRoot);
  const skills: Skill[] = [];
  for await (const file of new Bun.Glob("*/**/SKILL.md").scan({
    cwd: root,
    onlyFiles: true,
  })) {
    const skillDir = dirname(file);
    const segments = skillDir.split("/");
    const suite = segments[0] ?? "";
    if (
      excludedSuites.has(suite) ||
      segments.some(
        (segment, index) => index > 0 && excludedSegments.has(segment),
      )
    )
      continue;
    if ((await fs.lstat(join(root, skillDir))).isSymbolicLink()) continue;
    const frontmatter = parseFrontmatter(
      await fs.readFile(join(root, file), "utf8"),
    );
    const parent = segments.length > 1 ? segments[segments.length - 2] : suite;
    skills.push({
      suite,
      path: skillDir,
      category: parent === "skills" ? suite : (parent ?? suite),
      name: text(frontmatter.name) || basename(skillDir),
      description: text(frontmatter.description),
      frontmatter,
    });
  }
  return skills.sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
}

async function urlFor(repo: string, skill: Skill) {
  return (
    text(skill.frontmatter.url) ||
    text(skill.frontmatter.homepage) ||
    (await urlRules[skill.suite]?.(repo, skill)) ||
    ""
  );
}

export function parseCsv(source: string): Row[] {
  if (!source.trim()) return [];
  const parsed = Papa.parse<Record<string, string>>(source, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length)
    throw new Error(
      `Invalid ${csvPath}: ${parsed.errors
        .map((error) => `${error.message} (row ${error.row})`)
        .join("; ")}`,
    );
  return parsed.data.map((record) => {
    const row = Object.fromEntries(
      columns.map((column) => [column, record[column] ?? ""]),
    ) as Row;
    if (!row.path) throw new Error(`Invalid ${csvPath}: row without a path`);
    if (!statuses.includes(row.status))
      throw new Error(
        `Invalid ${csvPath}: unknown status "${row.status}" for ${row.path}`,
      );
    return row;
  });
}

export function serializeCsv(rows: Row[]) {
  return `${Papa.unparse(
    {
      fields: [...columns],
      data: rows.map((row) => columns.map((column) => row[column])),
    },
    { newline: "\n" },
  )}\n`;
}

export async function indexSkills(
  repo: string,
  existing: Row[],
): Promise<Row[]> {
  const previous = new Map(existing.map((row) => [row.path, row]));
  const rows: Row[] = [];
  for (const skill of await discoverSkills(repo)) {
    const row = previous.get(skill.path);
    previous.delete(skill.path);
    rows.push({
      status: !row || row.status === "deleted" ? "new" : row.status,
      path: skill.path,
      category: skill.category,
      name: skill.name,
      new_category: row?.new_category ?? "",
      new_name: row?.new_name ?? "",
      description: skill.description,
      url: await urlFor(repo, skill),
    });
  }
  for (const row of previous.values()) rows.push({ ...row, status: "deleted" });
  if (!rows.length) {
    throw new Error(
      `No skills found under ${suitesRoot}. Run \`git submodule update --init\`.`,
    );
  }
  return rows.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export async function syncSkillsCsv(repo: string, write = false) {
  const file = join(repo, csvPath);
  const current = (await fs.pathExists(file))
    ? await fs.readFile(file, "utf8")
    : "";
  const rows = await indexSkills(repo, parseCsv(current));
  const next = serializeCsv(rows);
  const stale = next !== current;
  if (stale && write) await fs.outputFile(file, next);
  if (stale && !write) {
    throw new Error(`${csvPath} is stale. Run \`bun run index-skills\`.`);
  }
  const count = (status: string) =>
    rows.filter((row) => row.status === status).length;
  return {
    total: rows.length,
    new: count("new"),
    deleted: count("deleted"),
    picked: count("picked"),
    changed: stale,
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const repo = resolve(
    args.find((arg) => !arg.startsWith("--")) ??
      join(import.meta.dir, "../../../.."),
  );
  const summary = await syncSkillsCsv(repo, !check);
  console.log(
    `${relative(repo, join(repo, csvPath))}: ${summary.total} skills, ${
      summary.new
    } new, ${summary.picked} picked, ${summary.deleted} deleted${
      summary.changed ? " (updated)" : ""
    }`,
  );
}
