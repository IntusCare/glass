import { afterEach, beforeEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fs } from "zx";
import { bumpVersion, nextMinor } from "./bump-version.js";

let repo: string;

beforeEach(async () => {
  repo = await fs.mkdtemp(join(tmpdir(), "bump-version-"));
});

afterEach(async () => {
  await fs.remove(repo);
});

test("nextMinor bumps the minor and resets the patch", () => {
  expect(nextMinor("1.3.1")).toBe("1.4.0");
  expect(nextMinor("2.9.0")).toBe("2.10.0");
  expect(() => nextMinor("1.3.1-beta.1")).toThrow();
});

test("bumps the skills package and syncs the plugin manifest", async () => {
  await fs.outputJson(join(repo, "crates/skillset/package.json"), {
    name: "@glass/skills",
    version: "1.3.1",
    dependencies: { zx: "8.8.5" },
  });
  await fs.outputJson(join(repo, ".claude-plugin/plugin.json"), {
    name: "glass",
    version: "1.3.0",
  });
  expect(await bumpVersion(repo)).toBe("1.4.0");
  expect(await fs.readJson(join(repo, "crates/skillset/package.json"))).toEqual(
    {
      name: "@glass/skills",
      version: "1.4.0",
      dependencies: { zx: "8.8.5" },
    },
  );
  expect(await fs.readJson(join(repo, ".claude-plugin/plugin.json"))).toEqual({
    name: "glass",
    version: "1.4.0",
  });
});
