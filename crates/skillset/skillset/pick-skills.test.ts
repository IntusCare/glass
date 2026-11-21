import { afterEach, beforeEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fs } from "zx";
import { pickSkills } from "./pick-skills.js";

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(join(tmpdir(), "pick-skills-"));
});

afterEach(async () => {
  await fs.remove(root);
});

const header =
  "status,path,category,name,new_category,new_name,new_description,description,url\n";

test("stubs invoke the installed plugin name, not the csv path prefix", async () => {
  const csv = join(root, "skills.csv");
  await fs.writeFile(
    csv,
    header +
      "picked,mattpocock/skills/engineering/tdd,engineering,tdd,eng,,,Test first.,\n" +
      "picked,gstack/retro,gstack,retro,eng,,,Retro.,\n",
  );
  await pickSkills(csv, root);
  expect(
    await fs.readFile(join(root, "eng/eng-tdd/SKILL.md"), "utf8"),
  ).toContain("Invoke `/mattpocock-skills:tdd`");
  expect(
    await fs.readFile(join(root, "eng/eng-retro/SKILL.md"), "utf8"),
  ).toContain("Invoke `/gstack:retro`");
});
