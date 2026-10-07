import { dirname, resolve } from "node:path";
import { fs } from "zx";
import { validateSkillManifest } from "./skill-manifest.js";

const repo = resolve(process.argv[2] ?? ".");
const input: unknown = await fs.readJson(
  resolve(repo, ".claude-plugin/plugin.json"),
);
const promotedSkills: string[] = [];

for (const bucket of ["engineering", "productivity"]) {
  for await (const path of new Bun.Glob(`skills/${bucket}/*/SKILL.md`).scan(
    repo,
  )) {
    promotedSkills.push(`./${dirname(path)}`);
  }
}

const manifest = validateSkillManifest(input, promotedSkills);
console.log(
  `Validated ${manifest.skills.length} promoted skills for ${manifest.name}.`,
);
