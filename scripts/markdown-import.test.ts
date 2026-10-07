import { expect, test } from "bun:test";
import readme from "../README.md" with { type: "text" };

test("markdown files import as raw text", () => {
  expect(readme).toContain("## Installation");
});
