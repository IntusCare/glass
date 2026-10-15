import { afterEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fs } from "zx";
import { syncGstackAgents } from "./gstack-agents.js";

const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => fs.remove(path)));
});

async function fixture() {
  const repo = await fs.mkdtemp(join(tmpdir(), "glass-gstack-agents-"));
  fixtures.push(repo);
  await fs.outputFile(
    join(repo, "gstack/review/specialists/security.md"),
    "# Security Specialist Review Checklist\n\nScope: When SCOPE_AUTH=true\n\n---\n\n## Categories\n\n- Example\n",
  );
  return repo;
}

test("writes an agent per specialist with the checklist verbatim", async () => {
  const repo = await fixture();
  expect(await syncGstackAgents(repo, true)).toEqual(["./agents/security.md"]);
  const agent = await fs.readFile(join(repo, "agents/security.md"), "utf8");
  expect(
    agent.startsWith('---\nname: security-reviewer\ndescription: "Reviews'),
  ).toBe(true);
  expect(agent).toContain(
    "tools:\n  - Read\n  - Grep\n  - Glob\n  - Bash\n---",
  );
  expect(agent).toContain("## Categories\n\n- Example\n");
  expect(await syncGstackAgents(repo)).toEqual(["./agents/security.md"]);
});

test("reports missing, stale, and orphaned agents without writing", async () => {
  const repo = await fixture();
  await expect(syncGstackAgents(repo)).rejects.toThrow("agents/security.md");
  await syncGstackAgents(repo, true);
  await fs.appendFile(join(repo, "agents/security.md"), "edited\n");
  await fs.outputFile(join(repo, "agents/orphan.md"), "orphan\n");
  await expect(syncGstackAgents(repo)).rejects.toThrow(
    /security\.md[\s\S]*orphan\.md|orphan\.md[\s\S]*security\.md/,
  );
  await syncGstackAgents(repo, true);
  expect(await fs.pathExists(join(repo, "agents/orphan.md"))).toBe(false);
});

test("rejects a specialist without a description", async () => {
  const repo = await fixture();
  await fs.outputFile(
    join(repo, "gstack/review/specialists/unknown.md"),
    "x\n",
  );
  await expect(syncGstackAgents(repo, true)).rejects.toThrow(
    "No description for specialist: unknown",
  );
});

test("requires the vendored specialists directory", async () => {
  const repo = await fs.mkdtemp(join(tmpdir(), "glass-gstack-agents-"));
  fixtures.push(repo);
  await expect(syncGstackAgents(repo)).rejects.toThrow(
    "Missing gstack/review/specialists",
  );
});
