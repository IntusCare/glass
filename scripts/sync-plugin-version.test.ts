import { afterEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $, fs } from "zx";

const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => fs.remove(path)));
});

async function fixture(pluginVersion: string) {
  const repo = await fs.mkdtemp(join(tmpdir(), "glass-version-"));
  fixtures.push(repo);
  await fs.outputJson(join(repo, "package.json"), {
    name: "glass",
    private: true,
  });
  await fs.outputJson(join(repo, "skills/package.json"), { version: "1.3.1" });
  await fs.outputJson(join(repo, ".claude-plugin/plugin.json"), {
    name: "glass",
    version: pluginVersion,
  });
  await fs.copy(
    join(import.meta.dir, "sync-plugin-version.mjs"),
    join(repo, "scripts/sync-plugin-version.mjs"),
  );
  return repo;
}

test("checks the skills workspace version rather than the root package", async () => {
  const repo = await fixture("1.3.1");
  const result = await $({
    cwd: repo,
    quiet: true,
  })`${process.execPath} scripts/sync-plugin-version.mjs --check`;
  expect(result.exitCode).toBe(0);
});

test("reports a mismatch without modifying the plugin", async () => {
  const repo = await fixture("0.0.0");
  const pluginPath = join(repo, ".claude-plugin/plugin.json");
  const before = await fs.readFile(pluginPath, "utf8");
  const result = await $({
    cwd: repo,
    quiet: true,
    nothrow: true,
  })`${process.execPath} scripts/sync-plugin-version.mjs --check`;
  expect(result.exitCode).toBe(1);
  expect(await fs.readFile(pluginPath, "utf8")).toBe(before);
});

test("synchronizes the plugin from the skills workspace version", async () => {
  const repo = await fixture("0.0.0");
  await $({
    cwd: repo,
    quiet: true,
  })`${process.execPath} scripts/sync-plugin-version.mjs`;
  expect(await fs.readJson(join(repo, ".claude-plugin/plugin.json"))).toEqual({
    name: "glass",
    version: "1.3.1",
  });
});
