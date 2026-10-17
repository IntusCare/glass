import { afterEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fs } from "zx";
import {
  columns,
  csvPath,
  indexSkills,
  parseCsv,
  serializeCsv,
  syncSkillsCsv,
} from "./index-skills.js";

const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => fs.remove(path)));
});

async function addSkill(
  repo: string,
  path: string,
  frontmatter = `name: ${path.split("/").pop()}\ndescription: Example, with "quotes"`,
) {
  await fs.outputFile(
    join(repo, "crates/skillset", path, "SKILL.md"),
    `---\n${frontmatter}\n---\n\nExample\n`,
  );
}

async function fixture() {
  const repo = await fs.mkdtemp(join(tmpdir(), "glass-index-skills-"));
  fixtures.push(repo);
  await addSkill(repo, "glass/engineering/workon");
  await fs.outputFile(join(repo, "docs/engineering/workon.md"), "# workon\n");
  await addSkill(repo, "mattpocock/skills/engineering/tdd");
  await fs.outputFile(
    join(repo, "crates/skillset/mattpocock/docs/engineering/tdd.md"),
    "# tdd\n",
  );
  await addSkill(repo, "mattpocock/skills/misc/scaffold");
  await addSkill(repo, "gstack", "name: gstack\ndescription: Router");
  await addSkill(repo, "gstack/ship");
  await addSkill(repo, "gstack/browser-skills/hackernews");
  await addSkill(repo, "impeccable/plugin/skills/impeccable");
  return repo;
}

test("indexes every suite except skillset, skipping fixtures and hidden copies", async () => {
  const repo = await fixture();
  await addSkill(repo, "skillset/engineering/picked");
  await addSkill(repo, "gstack/test/fixtures/alpha");
  await addSkill(repo, "impeccable/tests/oracle/impeccable");
  await addSkill(repo, "impeccable/.cursor/skills/impeccable");
  await addSkill(repo, "gstack/node_modules/dep");
  await fs.symlink("ship", join(repo, "crates/skillset/gstack/connect-chrome"));
  const rows = await indexSkills(repo, []);
  expect(rows.map((row) => row.path)).toEqual([
    "glass/engineering/workon",
    "gstack",
    "gstack/browser-skills/hackernews",
    "gstack/ship",
    "impeccable/plugin/skills/impeccable",
    "mattpocock/skills/engineering/tdd",
    "mattpocock/skills/misc/scaffold",
  ]);
  expect(rows.every((row) => row.status === "new")).toBe(true);
});

test("derives category, name, description and url per suite", async () => {
  const repo = await fixture();
  const byPath = new Map(
    (await indexSkills(repo, [])).map((row) => [row.path, row]),
  );
  expect(byPath.get("glass/engineering/workon")).toMatchObject({
    category: "engineering",
    name: "workon",
    description: 'Example, with "quotes"',
    url: "https://github.com/intuscare/glass/blob/main/docs/engineering/workon.md",
  });
  expect(byPath.get("gstack")).toMatchObject({
    category: "gstack",
    name: "gstack",
    description: "Router",
    url: "",
  });
  expect(byPath.get("gstack/ship")).toMatchObject({
    category: "gstack",
    url: "",
  });
  expect(byPath.get("gstack/browser-skills/hackernews")?.category).toBe(
    "browser-skills",
  );
  expect(byPath.get("impeccable/plugin/skills/impeccable")).toMatchObject({
    category: "impeccable",
    url: "https://impeccable.style",
  });
  expect(byPath.get("mattpocock/skills/engineering/tdd")).toMatchObject({
    category: "engineering",
    url: "https://aihero.dev/skills-tdd",
  });
  expect(byPath.get("mattpocock/skills/misc/scaffold")).toMatchObject({
    category: "misc",
    url: "",
  });
});

test("frontmatter url wins and missing frontmatter falls back to the directory name", async () => {
  const repo = await fixture();
  await addSkill(
    repo,
    "gstack/linked",
    "name: other\nurl: https://example.com/linked",
  );
  await fs.outputFile(
    join(repo, "crates/skillset/gstack/bare/SKILL.md"),
    "No frontmatter\n",
  );
  const byPath = new Map(
    (await indexSkills(repo, [])).map((row) => [row.path, row]),
  );
  expect(byPath.get("gstack/linked")).toMatchObject({
    name: "other",
    url: "https://example.com/linked",
  });
  expect(byPath.get("gstack/bare")).toMatchObject({
    name: "bare",
    description: "",
  });
});

test("preserves human columns, refreshes script columns, and flips statuses", async () => {
  const repo = await fixture();
  const first = await indexSkills(repo, []);
  const edited = first.map((row) =>
    row.path === "gstack/ship"
      ? {
          ...row,
          status: "picked",
          new_category: "engineering",
          new_name: "land",
          new_description: "Ship the reviewed changes",
        }
      : row.path === "mattpocock/skills/misc/scaffold"
        ? { ...row, status: "skipped" }
        : row,
  );
  edited.push({
    status: "picked",
    path: "gstack/gone",
    category: "gstack",
    name: "gone",
    new_category: "",
    new_name: "",
    new_description: "",
    description: "",
    url: "",
  });
  await addSkill(repo, "gstack/ship", "name: ship\ndescription: Updated");
  const second = await indexSkills(repo, edited);
  const byPath = new Map(second.map((row) => [row.path, row]));
  expect(byPath.get("gstack/ship")).toMatchObject({
    status: "picked",
    new_category: "engineering",
    new_name: "land",
    description: "Updated",
    new_description: "Ship the reviewed changes",
  });
  expect(byPath.get("mattpocock/skills/misc/scaffold")?.status).toBe("skipped");
  expect(byPath.get("gstack/gone")?.status).toBe("deleted");
  expect(byPath.get("glass/engineering/workon")?.status).toBe("new");
  expect(second.map((row) => row.path)).toEqual(
    [...second.map((row) => row.path)].sort(),
  );

  await addSkill(repo, "gstack/gone");
  const third = await indexSkills(repo, second);
  expect(third.find((row) => row.path === "gstack/gone")?.status).toBe("new");
});

test("csv round-trips and rejects unknown statuses", () => {
  const rows = [
    {
      status: "picked",
      path: "gstack/ship",
      category: "gstack",
      name: "ship",
      new_category: "",
      new_name: "",
      new_description: "",
      description: 'Commas, "quotes" and\nnewlines',
      url: "",
    },
  ];
  const csv = serializeCsv(rows);
  expect(csv.split("\n")[0]).toBe(columns.join(","));
  expect(parseCsv(csv)).toEqual(rows);
  expect(parseCsv("")).toEqual([]);
  expect(() =>
    parseCsv(`${columns.join(",")}\nmaybe,gstack/ship,,,,,,,\n`),
  ).toThrow('unknown status "maybe"');
});

test("check mode fails while the csv is stale and passes once written", async () => {
  const repo = await fixture();
  await expect(syncSkillsCsv(repo)).rejects.toThrow("bun run index-skills");
  expect(await fs.pathExists(join(repo, csvPath))).toBe(false);
  expect(await syncSkillsCsv(repo, true)).toMatchObject({
    total: 7,
    new: 7,
    changed: true,
  });
  expect(await syncSkillsCsv(repo)).toMatchObject({ changed: false });
  await addSkill(repo, "gstack/extra");
  await expect(syncSkillsCsv(repo)).rejects.toThrow("is stale");
});

test("fails loudly when no suite is checked out", async () => {
  const repo = await fs.mkdtemp(join(tmpdir(), "glass-index-skills-empty-"));
  fixtures.push(repo);
  await fs.ensureDir(join(repo, "crates/skillset"));
  await expect(indexSkills(repo, [])).rejects.toThrow(
    "git submodule update --init",
  );
});
