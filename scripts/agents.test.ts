import { afterEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fs } from "zx";
import { syncAgents, trimAgentProfile } from "./agents.js";

const fixtures: string[] = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => fs.remove(path)));
});

const upstreamAgent = `---
name: impeccable-documenter
description: Records DESIGN.md from a finished build.
tools: Read, Write, Bash
model: inherit
effort: medium
maxTurns: 30
---
# Impeccable Documenter

Body.
`;

const trimmedAgent = `---
name: impeccable-documenter
description: "Records DESIGN.md from a finished build."
tools:
  - Read
  - Write
  - Bash
---
# Impeccable Documenter

Body.
`;

async function fixture() {
  const repo = await fs.mkdtemp(join(tmpdir(), "glass-agents-"));
  fixtures.push(repo);
  await fs.outputFile(
    join(repo, "crates/skillset/gstack/review/specialists/security.md"),
    "# Security Specialist Review Checklist\n\nScope: When SCOPE_AUTH=true\n\n---\n\n## Categories\n\n- Example\n",
  );
  await fs.outputFile(
    join(
      repo,
      "crates/skillset/impeccable/plugin/agents/impeccable-documenter.md",
    ),
    upstreamAgent,
  );
  return repo;
}

const expectedAgents = [
  "./agents/impeccable-documenter.md",
  "./agents/security.md",
];

test("trims upstream agent frontmatter to name, description, and a tools list", () => {
  expect(trimAgentProfile(upstreamAgent)).toBe(trimmedAgent);
  expect(trimAgentProfile(trimmedAgent)).toBe(trimmedAgent);
  expect(() => trimAgentProfile("no frontmatter\n")).toThrow(
    "missing frontmatter",
  );
  expect(() => trimAgentProfile("---\nname: x\n---\nbody\n")).toThrow(
    "missing description",
  );
});

test("writes a reviewer per specialist and a trimmed copy of each impeccable agent", async () => {
  const repo = await fixture();
  expect((await syncAgents(repo, true)).sort()).toEqual(expectedAgents);
  const agent = await fs.readFile(join(repo, "agents/security.md"), "utf8");
  expect(
    agent.startsWith('---\nname: security-reviewer\ndescription: "Reviews'),
  ).toBe(true);
  expect(agent).toContain(
    "tools:\n  - Read\n  - Grep\n  - Glob\n  - Bash\n---",
  );
  expect(agent).toContain("## Categories\n\n- Example\n");
  expect(
    await fs.readFile(join(repo, "agents/impeccable-documenter.md"), "utf8"),
  ).toBe(trimmedAgent);
  expect((await syncAgents(repo)).sort()).toEqual(expectedAgents);
});

test("reports missing, stale, and orphaned agents without writing", async () => {
  const repo = await fixture();
  await expect(syncAgents(repo)).rejects.toThrow("agents/security.md");
  await syncAgents(repo, true);
  await fs.appendFile(join(repo, "agents/security.md"), "edited\n");
  await fs.outputFile(join(repo, "agents/orphan.md"), "orphan\n");
  await expect(syncAgents(repo)).rejects.toThrow(
    /security\.md[\s\S]*orphan\.md|orphan\.md[\s\S]*security\.md/,
  );
  await syncAgents(repo, true);
  expect(await fs.pathExists(join(repo, "agents/orphan.md"))).toBe(false);
});

test("rejects a specialist without a description", async () => {
  const repo = await fixture();
  await fs.outputFile(
    join(repo, "crates/skillset/gstack/review/specialists/unknown.md"),
    "x\n",
  );
  await expect(syncAgents(repo, true)).rejects.toThrow(
    "No description for specialist: unknown",
  );
});

test("requires both submodules to be checked out", async () => {
  const repo = await fs.mkdtemp(join(tmpdir(), "glass-agents-"));
  fixtures.push(repo);
  await expect(syncAgents(repo)).rejects.toThrow(
    "Missing crates/skillset/gstack/review/specialists",
  );
  await fs.ensureDir(join(repo, "crates/skillset/gstack/review/specialists"));
  await expect(syncAgents(repo)).rejects.toThrow(
    "Missing crates/skillset/impeccable/plugin/agents",
  );
});
