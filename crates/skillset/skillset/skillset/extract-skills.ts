#!/usr/bin/env bun
/**
 * Extract skills from skills.csv into the generated skillset.
 * 1. Copy picked skills to skillset/<category>/<name>/SKILL.md, applying CSV name and category overrides.
 * 2. Use new_description when supplied, otherwise the indexed source description.
 * 3. Remove previously generated Picks and support files that are no longer needed.
 * 4. Resolve references recursively, copy dependencies into skillset/infra, and rewrite paths.
 * 5. Make Picks model- and user-invokable, then synchronize plugin entries and local discovery.
 * Validate the complete result before writing; --check verifies without changing files.
 */
import { basename, join, resolve } from "node:path";
import { expectedAgents } from "@glass/scripts/agents";
import { isLegacySkillLink } from "@glass/scripts/local-skills";
import { validateSkillManifest } from "@glass/scripts/skill-manifest";
import { fs } from "zx";
import { ExtractionGraph, parseRules, rulesPath } from "./extraction-graph.js";
import {
  type GeneratedFile,
  inspect,
  manifestPath,
  statePath,
  syncGenerated,
  textFile,
} from "./generated-files.js";
import { csvPath, parseCsv, syncSkillsCsv } from "./index-skills.js";

export async function extractSkills(repo: string, write = false) {
  repo = resolve(repo);
  await syncSkillsCsv(repo);
  const rows = parseCsv(await fs.readFile(join(repo, csvPath), "utf8"));
  const picks = rows.filter((row) => row.status === "picked");
  const rules = (await fs.pathExists(join(repo, rulesPath)))
    ? parseRules(await fs.readJson(join(repo, rulesPath)))
    : { files: {} };
  const graph = new ExtractionGraph(repo, rows, rules);
  const { files, skills, agents } = await graph.build();
  for (const path of skills) {
    files.set(`.devin/skills/${basename(path)}`, {
      kind: "link",
      target: `../../${path.slice(2)}`,
    });
  }
  files.set(".agents/skills", { kind: "link", target: "../.devin/skills" });
  files.set(".claude/skills", { kind: "link", target: "../.devin/skills" });
  const agentPaths = [...agents.keys()]
    .map((path) => `./${graph.destination(path)}`)
    .sort();
  const manifest = await fs.readJson(join(repo, manifestPath));
  validateSkillManifest(
    { ...manifest, skills, agents: agentPaths },
    skills,
    agentPaths,
  );
  const legacy = new Map<string, GeneratedFile>();
  if (!(await inspect(repo, statePath))) {
    // Only the old generator's exact links and byte-for-byte agent output
    // can be adopted. All other pre-existing files remain unowned.
    for (const path of [".agents/skills", ".claude/skills"]) {
      const file = await inspect(repo, path);
      if (file?.kind === "link" && file.target === "../.devin/skills")
        legacy.set(path, file);
    }
    const local = join(repo, ".devin/skills");
    const stat = await fs.lstat(local, { throwIfNoEntry: false });
    if (stat && !stat.isDirectory())
      throw new Error("Refusing non-directory parent: .devin/skills");
    for (const name of stat ? await fs.readdir(local) : []) {
      const path = `.devin/skills/${name}`;
      const file = await inspect(repo, path);
      if (file?.kind === "link" && isLegacySkillLink(name, file.target))
        legacy.set(path, file);
    }
    const oldAgents = (manifest.agents ?? []).filter((path: string) =>
      /^\.\/agents\/[a-z0-9-]+\.md$/.test(path),
    );
    if (oldAgents.length) {
      const expected = await expectedAgents(repo);
      for (const path of oldAgents) {
        const content = expected.get(path.slice(2));
        if (content === undefined)
          throw new Error(`Unrecognized legacy agent: ${path}`);
        legacy.set(path.slice(2), textFile(content));
      }
    }
  }
  const changed = await syncGenerated(
    repo,
    files,
    skills.sort(),
    agentPaths,
    write,
    legacy,
  );
  return { picks: picks.length, changed };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const repo = resolve(
    args.find((arg) => !arg.startsWith("--")) ??
      join(import.meta.dir, "../../../.."),
  );
  const result = await extractSkills(repo, !args.includes("--check"));
  console.log(
    `Extracted ${result.picks} Picks (${result.changed} changed paths).`,
  );
}
