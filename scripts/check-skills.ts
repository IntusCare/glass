import { dirname, resolve } from "node:path";
import { fs } from "zx";
import { validateAgentProfiles } from "./agent-profiles.js";
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
  "impeccable/plugin/skills/*/SKILL.md",
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
const impeccableAgents: string[] = [];
for await (const path of new Bun.Glob("impeccable/plugin/agents/*.md").scan(
  repo,
)) {
  impeccableAgents.push(`./${path}`);
}
if (impeccableAgents.length === 0) {
  throw new Error(
    "Missing impeccable/plugin/agents. The vendored impeccable tree is incomplete.",
  );
}
agents.push(...impeccableAgents.sort());
await validateAgentProfiles(repo, agents);
console.log(
  `Validated ${agents.length} agent profiles against the Devin subagent format.`,
);
const manifest = validateSkillManifest(input, promotedSkills, agents);
console.log(
  `Validated ${manifest.skills.length} plugin skills and ${manifest.agents.length} agents for ${manifest.name}.`,
);
