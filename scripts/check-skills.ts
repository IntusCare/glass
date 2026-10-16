import { dirname, resolve } from "node:path";
import { fs } from "zx";
import { validateAgentProfiles } from "./agent-profiles.js";
import { syncAgents } from "./agents.js";
import { syncLocalSkills } from "./local-skills.js";
import { validateSkillManifest } from "./skill-manifest.js";

const repo = resolve(process.argv[2] ?? ".");
const input: unknown = await fs.readJson(
  resolve(repo, ".claude-plugin/plugin.json"),
);
const promotedSkills: string[] = [];

for (const pattern of [
  "crates/skillset/glass/engineering/*/SKILL.md",
  "crates/skillset/glass/productivity/*/SKILL.md",
  "crates/skillset/mattpocock/skills/engineering/*/SKILL.md",
  "crates/skillset/mattpocock/skills/productivity/*/SKILL.md",
  "crates/skillset/gstack/SKILL.md",
  "crates/skillset/gstack/*/SKILL.md",
  "crates/skillset/impeccable/plugin/skills/*/SKILL.md",
]) {
  for await (const path of new Bun.Glob(pattern).scan(repo)) {
    promotedSkills.push(`./${dirname(path)}`);
  }
}
for (const suite of ["gstack", "impeccable", "mattpocock"]) {
  if (
    !promotedSkills.some((skill) =>
      skill.startsWith(`./crates/skillset/${suite}/`),
    )
  ) {
    throw new Error(
      `No ${suite} skills found. Run \`git submodule update --init\` to check out crates/skillset/${suite}.`,
    );
  }
}

const localCount = await syncLocalSkills(repo);
console.log(
  `Validated ${localCount} local skills and their invocation policies.`,
);
const agents = await syncAgents(repo);
console.log(
  `Validated ${agents.length} agents generated from gstack and impeccable.`,
);
await validateAgentProfiles(repo, agents);
console.log(
  `Validated ${agents.length} agent profiles against the Devin subagent format.`,
);
const manifest = validateSkillManifest(input, promotedSkills, agents);
console.log(
  `Validated ${manifest.skills.length} plugin skills and ${manifest.agents.length} agents for ${manifest.name}.`,
);
