import { join, resolve } from "node:path";
import { fs } from "zx";

const allowedKeys = new Set(["name", "description", "tools"]);

function parseFrontmatter(content: string) {
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(content)?.[1];
  if (frontmatter === undefined) throw new Error("missing frontmatter");
  const fields = new Map<string, string[]>();
  let current: string | undefined;
  for (const line of frontmatter.split("\n")) {
    const item = /^ {2}- (.+)$/.exec(line)?.[1];
    if (item && current) {
      fields.get(current)?.push(item);
      continue;
    }
    const [, key, value] = /^([A-Za-z-]+):\s*(.*)$/.exec(line) ?? [];
    if (!key) throw new Error(`unparseable frontmatter line: ${line}`);
    current = key;
    fields.set(key, value ? [value] : []);
  }
  return fields;
}

export function validateAgentProfile(content: string) {
  const fields = parseFrontmatter(content);
  for (const key of fields.keys()) {
    if (!allowedKeys.has(key)) throw new Error(`unsupported field: ${key}`);
  }
  for (const key of ["name", "description"]) {
    if (fields.get(key)?.length !== 1) throw new Error(`missing ${key}`);
  }
  const tools = fields.get("tools");
  if (tools && tools.some((tool) => tool.includes(","))) {
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
