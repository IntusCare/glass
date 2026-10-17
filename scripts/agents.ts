import { join } from "node:path";
import { fs } from "zx";

const specialistsDirectory = "crates/skillset/gstack/review/specialists";
const impeccableDirectory = "crates/skillset/impeccable/plugin/agents";
const agentsDirectory = "agents";
const tools = ["Read", "Grep", "Glob", "Bash"];
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

const descriptions: Record<string, string> = {
  "api-contract":
    "Reviews a diff for breaking API changes: removed or retyped fields, changed status codes, pagination and versioning drift. Delegate when the diff touches public endpoints, request or response schemas, or client-facing types.",
  "data-migration":
    "Reviews a diff for unsafe schema and data migrations: locking, irreversibility, backfills, and deploy ordering. Delegate when the diff adds or edits migrations or changes a table used in production.",
  maintainability:
    "Reviews a diff for maintainability: naming, duplication, oversized functions, tangled dependencies, and missing documentation. Delegate on every review of 50 or more changed lines.",
  performance:
    "Reviews a diff for performance regressions: N+1 queries, missing indexes, unbounded loops, blocking I/O, and heavy frontend work. Delegate when the diff touches backend data access or frontend rendering.",
  "red-team":
    "Adversarial review that hunts what other reviewers missed: load, concurrency, silent failures, trust assumptions, and edge cases. Delegate last, after the other specialists, on large diffs or when a security review found critical findings.",
  security:
    "Reviews a diff for auth and authorization bypass, injection beyond SQL, cryptographic misuse, secrets exposure, XSS escape hatches, and unsafe deserialization. Delegate when the diff touches auth, user input, or a large backend surface.",
  simplification:
    "Advisory review that finds unrequested structure in a diff: one-implementation abstractions, hand-rolled stdlib, dependencies duplicating platform features, and dead flexibility. Delegate on diffs over 100 lines; findings are suggestions, never coverage gaps.",
  testing:
    "Reviews a diff for test coverage and test quality: untested branches, implementation-coupled tests, missing failure-path tests, and flaky patterns. Delegate on every review of 50 or more changed lines.",
};

function renderFrontmatter(
  name: string,
  description: string,
  agentTools: string[],
) {
  return `---
name: ${name}
description: ${JSON.stringify(description)}
tools:
${agentTools.map((tool) => `  - ${tool}`).join("\n")}
---
`;
}

export function renderReviewer(name: string, checklist: string) {
  const description = descriptions[name];
  if (!description) throw new Error(`No description for specialist: ${name}`);
  return `${renderFrontmatter(`${name}-reviewer`, description, tools)}
You are gstack's ${name} review specialist, running as a standalone subagent. The checklist below is copied verbatim from \`${specialistsDirectory}/${name}.md\`; regenerate this file with \`bun run agents\` instead of editing it.

Ignore the checklist's \`Scope:\` line: the caller already decided to dispatch you. Get the diff with \`git diff "$(git merge-base <base> HEAD)"\` using the base the caller names (default \`origin/main\`), read the full content of changed files when a hunk is not enough, then apply the checklist. Report findings in the checklist's JSON format, one object per line, or \`NO FINDINGS\` and nothing else.

${checklist.trim()}
`;
}

export function trimAgentProfile(source: string) {
  const match = frontmatterPattern.exec(source);
  if (!match) throw new Error("missing frontmatter");
  const parsed: unknown = Bun.YAML.parse(match[1] ?? "");
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    throw new Error("frontmatter must be a YAML mapping");
  const { name, description, tools } = parsed as Record<string, unknown>;
  if (typeof name !== "string" || !name) throw new Error("missing name");
  if (typeof description !== "string" || !description)
    throw new Error("missing description");
  const agentTools =
    typeof tools === "string"
      ? tools.split(",").map((tool) => tool.trim())
      : Array.isArray(tools) && tools.every((t) => typeof t === "string")
        ? tools
        : undefined;
  if (!agentTools?.length || agentTools.some((tool) => !tool))
    throw new Error("tools must be a list or comma-separated string");
  return (
    renderFrontmatter(name, description, agentTools) +
    source.slice(match[0].length)
  );
}

export async function expectedAgents(repo: string) {
  const expected = new Map<string, string>();
  const specialists = join(repo, specialistsDirectory);
  if (!(await fs.pathExists(specialists))) {
    throw new Error(
      `Missing ${specialistsDirectory}. Run \`git submodule update --init\`.`,
    );
  }
  const specialistFiles: string[] = await fs.readdir(specialists);
  for (const file of specialistFiles.filter((f) => f.endsWith(".md")).sort()) {
    const name = file.slice(0, -3);
    const checklist = await fs.readFile(join(specialists, file), "utf8");
    expected.set(`${agentsDirectory}/${file}`, renderReviewer(name, checklist));
  }
  const impeccable = join(repo, impeccableDirectory);
  if (!(await fs.pathExists(impeccable))) {
    throw new Error(
      `Missing ${impeccableDirectory}. Run \`git submodule update --init\`.`,
    );
  }
  const impeccableFiles: string[] = await fs.readdir(impeccable);
  for (const file of impeccableFiles.filter((f) => f.endsWith(".md")).sort()) {
    const path = `${agentsDirectory}/${file}`;
    if (expected.has(path)) throw new Error(`Duplicate agent: ${file}`);
    const source = await fs.readFile(join(impeccable, file), "utf8");
    try {
      expected.set(path, trimAgentProfile(source));
    } catch (error) {
      throw new Error(
        `${impeccableDirectory}/${file}: ${(error as Error).message}`,
      );
    }
  }
  return expected;
}
