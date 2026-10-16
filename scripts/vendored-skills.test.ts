import { afterEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fs } from "zx";
import { syncVendoredSkills, trimTriggers } from "./vendored-skills.js";

const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => fs.remove(path)));
});

const withTriggers = `---
name: browse
preamble-tier: 1
version: 2.0.0
description: "Drive a real browser: open a page. (gstack)"
triggers:
  - browse a page
  - open this url
allowed-tools:
  - Bash
  - Read
---

# /browse
`;

const trimmed = `---
name: browse
preamble-tier: 1
version: 2.0.0
description: "Drive a real browser: open a page. (gstack)"
allowed-tools:
  - Bash
  - Read
---

# /browse
`;

test("trimTriggers removes only the triggers block", () => {
  expect(trimTriggers(withTriggers)).toBe(trimmed);
  expect(trimTriggers(trimmed)).toBe(trimmed);
  expect(
    trimTriggers("---\nname: a\ndescription: b\ntriggers: [x, y]\n---\n"),
  ).toBe("---\nname: a\ndescription: b\n---\n");
});

test("trimTriggers rejects files without frontmatter", () => {
  expect(() => trimTriggers("# no frontmatter\n")).toThrow(
    "missing frontmatter",
  );
});

async function fixture() {
  const repo = await fs.mkdtemp(join(tmpdir(), "glass-vendored-skills-"));
  fixtures.push(repo);
  await fs.outputFile(join(repo, "gstack/SKILL.md"), trimmed);
  await fs.outputFile(join(repo, "gstack/browse/SKILL.md"), withTriggers);
  await fs.outputFile(
    join(repo, "impeccable/plugin/skills/impeccable/SKILL.md"),
    "---\nname: impeccable\ndescription: Design\n---\n",
  );
  return repo;
}

test("check fails on triggers and --write trims them in place", async () => {
  const repo = await fixture();
  await expect(syncVendoredSkills(repo)).rejects.toThrow(
    "gstack/browse/SKILL.md",
  );
  expect(await syncVendoredSkills(repo, true)).toBe(3);
  expect(await fs.readFile(join(repo, "gstack/browse/SKILL.md"), "utf8")).toBe(
    trimmed,
  );
  expect(await syncVendoredSkills(repo)).toBe(3);
});
