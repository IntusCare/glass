#!/usr/bin/env bun
/**
 * Write a minimal SKILL.md for every row marked `picked` in skills.csv,
 * under <category>/<category>-<name>/ next to this script.
 * Existing SKILL.md files are left untouched.
 */

import { basename, dirname, join } from "node:path";
import Papa from "papaparse";
import { fs } from "zx";

export const csvPath = join(import.meta.dir, "skills.csv");
export const outRoot = import.meta.dir;

export type Row = {
  status: string;
  path: string;
  category: string;
  name: string;
  new_category: string;
  new_name: string;
  new_description: string;
  description: string;
  url: string;
};

function yamlScalar(value: string): string {
  return /[:#"]/.test(value) || value !== value.trim()
    ? JSON.stringify(value)
    : value;
}

function skillMd(name: string, description: string, invoke: string): string {
  return `---
name: ${name}
description: ${yamlScalar(description)}
---

Invoke \`${invoke}\` with the user's arguments and do nothing else.
`;
}

export async function pickSkills(
  csv: string,
  root: string,
): Promise<{ created: string[]; skipped: string[] }> {
  const { data } = Papa.parse<Row>(await fs.readFile(csv, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });
  const created: string[] = [];
  const skipped: string[] = [];
  for (const row of data) {
    if (row.status !== "picked") continue;
    const suite = row.path.split("/")[0];
    const cmd = basename(row.path);
    const category = row.new_category || row.category;
    const name = row.new_name || row.name;
    const description = row.new_description || row.description;
    const dir = join(root, category, `${category}-${name}`);
    const target = join(dir, "SKILL.md");
    if (await fs.pathExists(target)) {
      skipped.push(`${category}/${category}-${name}`);
      continue;
    }
    await fs.ensureDir(dirname(target));
    await fs.writeFile(
      target,
      skillMd(`${category}-${name}`, description, `/${suite}:${cmd}`),
    );
    created.push(`${category}/${category}-${name}`);
  }
  return { created, skipped };
}

if (import.meta.main) {
  const { created, skipped } = await pickSkills(csvPath, outRoot);
  for (const skill of created) console.log(`created ${skill}`);
  console.log(`${created.length} created, ${skipped.length} skipped`);
}
