import { dirname, resolve } from "node:path";
import { fs } from "zx";
import { syncGstackAgents } from "./gstack-agents.js";
import { syncLocalSkills } from "./local-skills.js";
import { validateSkillManifest } from "./skill-manifest.js";

const repo = resolve(process.argv[2] ?? ".");
const input: unknown = await fs.readJson(
  resolve(repo, ".claude-plugin/plugin.json"),
);
const promotedSkills: string[] = [];

for (const pattern of [
  "skills/engineering/*/SKILL.md",
  "skills/productivity/*/SKILL.md",
  "gstack/SKILL.md",
  "gstack/*/SKILL.md",
]) {
  for await (const path of new Bun.Glob(pattern).scan(repo)) {
    promotedSkills.push(`./${dirname(path)}`);
  }
}

const localCount = await syncLocalSkills(repo);
console.log(
  `Validated ${localCount} local skills and their invocation policies.`,
);
const agents = await syncGstackAgents(repo);
console.log(`Validated ${agents.length} agents generated from gstack.`);
const manifest = validateSkillManifest(input, promotedSkills, agents);
console.log(
  `Validated ${manifest.skills.length} plugin skills and ${manifest.agents.length} agents for ${manifest.name}.`,
);
