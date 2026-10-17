import { dirname, resolve } from "node:path";
import { fs } from "zx";
import { validateAgentProfiles } from "./agent-profiles.js";
import { syncLocalSkills } from "./local-skills.js";
import { validateSkillManifest } from "./skill-manifest.js";

const repo = resolve(process.argv[2] ?? ".");
const root = "crates/skillset/skillset/skillset";
const inventory = await fs.readJson(resolve(repo, root, "extracted.json"));
const input: unknown = await fs.readJson(
  resolve(repo, ".claude-plugin/plugin.json"),
);
const skills: string[] = [];
for await (const path of new Bun.Glob(`${root}/*/*/SKILL.md`).scan(repo)) {
  if (!path.startsWith(`${root}/infra/`)) skills.push(`./${dirname(path)}`);
}

const localCount = await syncLocalSkills(repo);
const manifest = validateSkillManifest(input, skills, inventory.agents);
await validateAgentProfiles(repo, manifest.agents);
console.log(
  `Validated ${localCount} generated Picks and ${manifest.agents.length} required agents.`,
);
