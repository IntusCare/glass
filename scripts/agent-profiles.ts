import { join, resolve } from "node:path";
import { fs } from "zx";

const allowedKeys = new Set(["name", "description", "tools"]);

function parseFrontmatter(content: string): Record<string, unknown> {
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(content)?.[1];
  if (frontmatter === undefined) throw new Error("missing frontmatter");
  let parsed: unknown;
  try {
    parsed = Bun.YAML.parse(frontmatter);
  } catch (error) {
    throw new Error(`invalid YAML frontmatter: ${(error as Error).message}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("frontmatter must be a YAML mapping");
  }
  return parsed as Record<string, unknown>;
}

export function validateAgentProfile(content: string) {
  const fields = parseFrontmatter(content);
  for (const key of Object.keys(fields)) {
    if (!allowedKeys.has(key)) throw new Error(`unsupported field: ${key}`);
  }
  for (const key of ["name", "description"]) {
    const value = fields[key];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`missing ${key}`);
    }
  }
  const tools = fields.tools;
  if (
    tools !== undefined &&
    (!Array.isArray(tools) ||
      tools.some((tool) => typeof tool !== "string" || tool.includes(",")))
  ) {
    throw new Error("tools must be a YAML list, not a comma-separated string");
  }
}

export async function validateAgentProfiles(repo: string, agents: string[]) {
  for (const agent of agents) {
    const content = await fs.readFile(join(resolve(repo), agent), "utf8");
    try {
      validateAgentProfile(content);
    } catch (error) {
      throw new Error(`${agent}: ${(error as Error).message}`);
    }
  }
}
