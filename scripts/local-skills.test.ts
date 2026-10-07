import { afterEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fs } from "zx";
import { syncLocalSkills } from "./local-skills.js";

const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => fs.remove(path)));
});

async function addSkill(repo: string, bucket: string, name: string) {
  const path = join(repo, "skills", bucket, name);
  await fs.outputFile(
    join(path, "SKILL.md"),
    `---\nname: ${name}\ndescription: Example skill\n---\n\nExample\n`,
  );
  await fs.outputFile(
    join(path, "agents/openai.yaml"),
    "interface:\n  display_name: Example\n",
  );
  return path;
}

async function fixture() {
  const repo = await fs.mkdtemp(join(tmpdir(), "glass-local-skills-"));
  fixtures.push(repo);
  await addSkill(repo, "engineering", "example");
  return repo;
}

test("check reports missing links without creating directories", async () => {
  const repo = await fixture();
  await expect(syncLocalSkills(repo)).rejects.toThrow("bun run link-skills");
  expect(await fs.pathExists(join(repo, ".devin"))).toBe(false);
});

test("links every bucket for all three agents and is idempotent", async () => {
  const repo = await fixture();
  for (const bucket of ["productivity", "in-progress", "misc", "deprecated"]) {
    await addSkill(repo, bucket, bucket);
  }
  expect(await syncLocalSkills(repo, true)).toBe(5);
  await syncLocalSkills(repo, true);
  expect(await syncLocalSkills(repo)).toBe(5);
  for (const agent of [".devin", ".agents", ".claude"]) {
    expect(await fs.realpath(join(repo, agent, "skills/example"))).toBe(
      await fs.realpath(join(repo, "skills/engineering/example")),
    );
  }
  expect(await fs.readlink(join(repo, ".devin/skills/example"))).toBe(
    "../../skills/engineering/example",
  );
  expect(await fs.readlink(join(repo, ".agents/skills"))).toBe(
    "../.devin/skills",
  );
  await fs.outputFile(
    join(repo, "skills/engineering/example/reference.md"),
    "live content",
  );
  expect(
    await fs.readFile(
      join(repo, ".claude/skills/example/reference.md"),
      "utf8",
    ),
  ).toBe("live content");
});

test("refresh handles renamed and removed skills and check detects stale links", async () => {
  const repo = await fixture();
  await syncLocalSkills(repo, true);
  await fs.remove(join(repo, "skills/engineering/example"));
  await addSkill(repo, "misc", "renamed");
  await expect(syncLocalSkills(repo)).rejects.toThrow("bun run link-skills");
  await syncLocalSkills(repo, true);
  expect(await fs.pathExists(join(repo, ".devin/skills/example"))).toBe(false);
  expect(await syncLocalSkills(repo)).toBe(1);
});

test("refresh updates a skill moved between buckets", async () => {
  const repo = await fixture();
  await syncLocalSkills(repo, true);
  await fs.ensureDir(join(repo, "skills/misc"));
  await fs.move(
    join(repo, "skills/engineering/example"),
    join(repo, "skills/misc/example"),
  );
  await expect(syncLocalSkills(repo)).rejects.toThrow("bun run link-skills");
  await syncLocalSkills(repo, true);
  expect(await fs.readlink(join(repo, ".devin/skills/example"))).toBe(
    "../../skills/misc/example",
  );
  expect(await syncLocalSkills(repo)).toBe(1);
});

test("refresh preserves a conflicting compatibility directory", async () => {
  const repo = await fixture();
  await fs.outputFile(join(repo, ".claude/skills/custom/SKILL.md"), "keep me");
  await expect(syncLocalSkills(repo, true)).rejects.toThrow("Refusing");
  expect(
    await fs.readFile(join(repo, ".claude/skills/custom/SKILL.md"), "utf8"),
  ).toBe("keep me");
  expect(await fs.pathExists(join(repo, ".devin"))).toBe(false);
});

test("refresh refuses a symlinked local skills directory", async () => {
  const repo = await fixture();
  await fs.ensureDir(join(repo, ".devin"));
  await fs.ensureDir(join(repo, "elsewhere"));
  await fs.symlink("../elsewhere", join(repo, ".devin/skills"));
  await expect(syncLocalSkills(repo, true)).rejects.toThrow("Refusing");
  expect(await fs.readdir(join(repo, "elsewhere"))).toEqual([]);
});

test("check rejects user-only Devin triggers", async () => {
  const repo = await fixture();
  await fs.outputFile(
    join(repo, "skills/engineering/example/SKILL.md"),
    "---\nname: example\ndescription: Example\ntriggers: [user]\n---\n",
  );
  await expect(syncLocalSkills(repo, true)).rejects.toThrow("model invocation");
});

test("relative links survive relocating a checkout", async () => {
  const repo = await fixture();
  await syncLocalSkills(repo, true);
  const moved = `${repo}-moved`;
  fixtures.push(moved);
  await fs.move(repo, moved);
  expect(await syncLocalSkills(moved)).toBe(1);
});

test("duplicate skill names fail before writing links", async () => {
  const repo = await fixture();
  await addSkill(repo, "misc", "example");
  await expect(syncLocalSkills(repo, true)).rejects.toThrow(
    "Duplicate skill name",
  );
  expect(await fs.pathExists(join(repo, ".devin"))).toBe(false);
});

test("refresh refuses to overwrite a real file", async () => {
  const repo = await fixture();
  await fs.outputFile(join(repo, ".devin/skills/example"), "keep me");
  await expect(syncLocalSkills(repo, true)).rejects.toThrow("Refusing");
  expect(await fs.readFile(join(repo, ".devin/skills/example"), "utf8")).toBe(
    "keep me",
  );
});

test("refresh refuses unrelated symlinks", async () => {
  const repo = await fixture();
  await fs.ensureDir(join(repo, ".devin/skills"));
  await fs.symlink("../../unrelated", join(repo, ".devin/skills/example"));
  await expect(syncLocalSkills(repo, true)).rejects.toThrow("Refusing");
  expect(await fs.readlink(join(repo, ".devin/skills/example"))).toBe(
    "../../unrelated",
  );
});

test("refresh refuses a symlinked agent directory", async () => {
  const repo = await fixture();
  await fs.ensureDir(join(repo, "elsewhere"));
  await fs.symlink("elsewhere", join(repo, ".devin"));
  await expect(syncLocalSkills(repo, true)).rejects.toThrow("Refusing");
  expect(await fs.readdir(join(repo, "elsewhere"))).toEqual([]);
});

test("check rejects user-only Claude metadata", async () => {
  const repo = await fixture();
  await fs.outputFile(
    join(repo, "skills/engineering/example/SKILL.md"),
    "---\nname: example\ndescription: Example\ndisable-model-invocation: true\n---\n",
  );
  await expect(syncLocalSkills(repo, true)).rejects.toThrow("model invocation");
});

test("check rejects user-only Codex metadata", async () => {
  const repo = await fixture();
  await fs.outputFile(
    join(repo, "skills/engineering/example/agents/openai.yaml"),
    "policy:\n  allow_implicit_invocation: false\n",
  );
  await expect(syncLocalSkills(repo, true)).rejects.toThrow("model invocation");
});
