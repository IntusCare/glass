import { expect, test } from "bun:test";
import { validateAgentProfile } from "./agent-profiles.js";

const valid = `---
name: reviewer
description: Reviews a diff
tools:
  - Read
  - Grep
---

Body.
`;

test("accepts name, description, and tools as a list", () => {
  expect(() => validateAgentProfile(valid)).not.toThrow();
});

test("rejects comma-separated tools", () => {
  expect(() =>
    validateAgentProfile(
      valid.replace("tools:\n  - Read\n  - Grep", "tools: Read, Grep"),
    ),
  ).toThrow("YAML list");
});

test("rejects fields Devin does not load", () => {
  for (const field of ["model: inherit", "effort: high", "maxTurns: 30"]) {
    expect(() =>
      validateAgentProfile(valid.replace("tools:", `${field}\ntools:`)),
    ).toThrow("unsupported field");
  }
});

test("rejects an unquoted description that YAML cannot parse", () => {
  expect(() =>
    validateAgentProfile(
      valid.replace(
        "description: Reviews a diff",
        "description: Reviews: diffs",
      ),
    ),
  ).toThrow("invalid YAML frontmatter");
  expect(() =>
    validateAgentProfile(
      valid.replace(
        "description: Reviews a diff",
        'description: "Reviews: diffs"',
      ),
    ),
  ).not.toThrow();
});

test("requires name and description", () => {
  expect(() =>
    validateAgentProfile(valid.replace("name: reviewer\n", "")),
  ).toThrow("missing name");
});
