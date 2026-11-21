#!/usr/bin/env bun
/**
 * Bump @glass/skills to the next minor version and copy it into
 * .claude-plugin/plugin.json. The Release workflow runs this on every push
 * to main. Prints only the new version, so CI can capture it.
 */

import { join } from "node:path";
import { fs } from "zx";

export const repoRoot = join(import.meta.dir, "..", "..", "..");

export function nextMinor(version: string): string {
  const match = /^(\d+)\.(\d+)\.\d+$/.exec(version);
  if (!match) throw new Error(`Not a plain x.y.z version: ${version}`);
  const [, major, minor] = match;
  return `${major}.${Number(minor) + 1}.0`;
}

/** Rewrite only the version field, to keep key order and formatting. */
function withVersion(source: string, version: string, path: string): string {
  const updated = source.replace(
    /("version"\s*:\s*")[^"]*(")/,
    `$1${version}$2`,
  );
  if (JSON.parse(updated).version !== version) {
    throw new Error(`Could not find a version field in ${path}`);
  }
  return updated;
}

export async function bumpVersion(repo: string): Promise<string> {
  const packagePath = join(repo, "crates", "skillset", "package.json");
  const pluginPath = join(repo, ".claude-plugin", "plugin.json");
  const packageSource = await fs.readFile(packagePath, "utf8");
  const pluginSource = await fs.readFile(pluginPath, "utf8");
  const version = nextMinor(JSON.parse(packageSource).version);
  await fs.writeFile(
    packagePath,
    withVersion(packageSource, version, packagePath),
  );
  await fs.writeFile(
    pluginPath,
    withVersion(pluginSource, version, pluginPath),
  );
  return version;
}

if (import.meta.main) {
  console.log(await bumpVersion(repoRoot));
}
