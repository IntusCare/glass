import { basename, dirname, join, posix } from "node:path";
import { validateAgentProfile } from "@glass/scripts/agent-profiles";
import { renderReviewer, trimAgentProfile } from "@glass/scripts/agents";
import { fs } from "zx";
import {
  type GeneratedFile,
  outputRoot,
  safePath,
  textFile,
  toolingRoot,
} from "./generated-files.js";
import type { Row } from "./index-skills.js";

export const rulesPath = `${toolingRoot}/extraction-rules.json`;
const skillDirectoryVariable = `\${CLAUDE_SKILL_DIR}/`;
export type FileRule = {
  dependencies?: string[];
  references?: Record<string, string>;
  rewrites?: Record<string, string>;
  skills?: Record<string, string>;
  external?: string[];
  agents?: { path: string; kind: "profile" | "gstack-reviewer" }[];
};
export type Rules = { files: Record<string, FileRule> };

export function parseRules(value: unknown): Rules {
  const mapping = (item: unknown): item is Record<string, unknown> =>
    !!item && typeof item === "object" && !Array.isArray(item);
  const strings = (item: unknown) =>
    Array.isArray(item) && item.every((s) => typeof s === "string" && s.length);
  if (
    !mapping(value) ||
    !mapping(value.files) ||
    Object.keys(value).some((key) => key !== "files")
  )
    throw new Error("Extraction rules must contain a files mapping");
  for (const [path, rule] of Object.entries(value.files)) {
    safePath(path);
    if (
      !mapping(rule) ||
      Object.keys(rule).some(
        (key) =>
          ![
            "dependencies",
            "references",
            "rewrites",
            "skills",
            "external",
            "agents",
          ].includes(key),
      )
    )
      throw new Error(`Invalid extraction rule: ${path}`);
    for (const key of ["dependencies", "external"]) {
      if (rule[key] !== undefined && !strings(rule[key]))
        throw new Error(`${path}: ${key} must be a string list`);
    }
    for (const key of ["references", "skills", "rewrites"]) {
      const fields = rule[key];
      if (
        fields !== undefined &&
        (!mapping(fields) ||
          Object.entries(fields).some(
            ([token, target]) =>
              !token || typeof target !== "string" || !target,
          ))
      )
        throw new Error(`${path}: ${key} must map tokens to paths`);
    }
    if (
      rule.agents !== undefined &&
      (!Array.isArray(rule.agents) ||
        rule.agents.some(
          (agent) =>
            !mapping(agent) ||
            typeof agent.path !== "string" ||
            !["profile", "gstack-reviewer"].includes(String(agent.kind)),
        ))
    )
      throw new Error(`${path}: invalid agent rule`);
  }
  return value as Rules;
}

export function frontmatter(source: string, path: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) throw new Error(`Missing frontmatter: ${path}`);
  const value: unknown = Bun.YAML.parse(match[1] ?? "");
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`Invalid frontmatter: ${path}`);
  return {
    metadata: value as Record<string, unknown>,
    body: source.slice(match[0].length),
  };
}

export function renderSkill(source: string, row: Row) {
  const { metadata, body } = frontmatter(source, row.path);
  metadata.name = row.new_name || row.name;
  metadata.description = row.new_description || row.description;
  if (!metadata.description)
    throw new Error(`Missing description: ${row.path}`);
  delete metadata["disable-model-invocation"];
  metadata["user-invocable"] = true;
  metadata.triggers = ["model", "user"];
  return `---\n${Bun.YAML.stringify(metadata)}\n---\n${body}`;
}

function relativeReference(from: string, to: string) {
  return posix.relative(posix.dirname(from), to) || posix.basename(to);
}

function isExternal(value: string) {
  return /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(value);
}

export class ExtractionGraph {
  readonly files = new Map<string, GeneratedFile>();
  readonly agentRequests = new Map<string, "profile" | "gstack-reviewer">();
  private readonly pending = new Set<string>();
  private readonly seen = new Set<string>();
  private readonly picks = new Map<string, Row>();
  private readonly targets = new Map<string, string>();

  constructor(
    private readonly repo: string,
    private readonly rows: Row[],
    private readonly rules: Rules,
  ) {
    const names = new Set<string>();
    const paths = new Set<string>();
    for (const row of rows) {
      safePath(row.path);
      if (row.path.split("/")[0] === "skillset")
        throw new Error(`Output cannot be a source: ${row.path}`);
      if (paths.has(row.path))
        throw new Error(`Duplicate CSV path: ${row.path}`);
      paths.add(row.path);
      if (row.status !== "picked") continue;
      const name = row.new_name || row.name;
      const category = row.new_category || row.category;
      if (
        !/^[a-z0-9-]+$/.test(name) ||
        !/^[a-z0-9-]+$/.test(category) ||
        category === "infra"
      )
        throw new Error(`Invalid name/category for ${row.path}`);
      if (names.has(name)) throw new Error(`Duplicate Pick name: ${name}`);
      names.add(name);
      this.picks.set(`${row.path}/SKILL.md`, row);
      this.targets.set(
        `${row.path}/SKILL.md`,
        `${outputRoot}/${category}/${name}/SKILL.md`,
      );
    }
  }

  destination(source: string) {
    safePath(source);
    return (
      this.targets.get(source) ??
      `${outputRoot}/infra/${source.replace(
        /(^|\/)SKILL\.md$/,
        "$1instructions.md",
      )}`
    );
  }

  async sourceFile(source: string) {
    safePath(source);
    if (source.split("/")[0] === "skillset")
      throw new Error(`Output cannot be a dependency: ${source}`);
    const parts = source.split("/");
    // Source links can escape a suite or depend on an untracked developer file.
    // Require an explicit regular source instead of copying through such links.
    for (let i = 1; i <= parts.length; i++) {
      const path = join(this.repo, "crates/skillset", ...parts.slice(0, i));
      const stat = await fs.lstat(path, { throwIfNoEntry: false });
      if (!stat) throw new Error(`Missing dependency: ${source}`);
      if (stat.isSymbolicLink())
        throw new Error(`Symlink dependency needs a regular source: ${source}`);
      if (i < parts.length && !stat.isDirectory())
        throw new Error(`Non-directory source: ${source}`);
      if (i === parts.length) {
        if (!stat.isFile())
          throw new Error(`Expected dependency file: ${source}`);
        return {
          content: await fs.readFile(path),
          mode: stat.mode & 0o111 ? 0o755 : 0o644,
        };
      }
    }
    throw new Error(`Invalid source: ${source}`);
  }

  private require(source: string) {
    safePath(source);
    if (/^gstack\/review\/specialists\/[^/]+\.md$/.test(source))
      this.agentRequests.set(source, "gstack-reviewer");
    if (/^impeccable\/plugin\/agents\/impeccable-[^/]+\.md$/.test(source))
      this.agentRequests.set(source, "profile");
    if (!this.seen.has(source)) this.pending.add(source);
    return this.destination(source);
  }

  private findSkill(name: string, from: string) {
    const explicit = this.rules.files[from]?.skills?.[name];
    const matches = this.rows.filter(
      (row) =>
        row.status !== "deleted" &&
        (explicit ? row.path === explicit : row.name === name),
    );
    const local = matches.filter(
      (row) => row.path.split("/")[0] === from.split("/")[0],
    );
    const candidates = explicit || !local.length ? matches : local;
    const candidate = candidates[0];
    if (candidates.length !== 1 || !candidate) {
      throw new Error(
        `${from}: ${
          candidates.length ? "Ambiguous" : "Unknown"
        } skill "${name}"; add an explicit extraction rule`,
      );
    }
    return candidate;
  }

  private skillReference(name: string, from: string, invocation: boolean) {
    const row = this.findSkill(name, from);
    const source = `${row.path}/SKILL.md`;
    const target = this.require(source);
    if (this.picks.has(source))
      return invocation
        ? `Call the Skill tool with "${row.new_name || row.name}"`
        : `\`/${row.new_name || row.name}\``;
    const link = `[${row.name} instructions](${relativeReference(
      this.destination(from),
      target,
    )})`;
    return invocation ? `Read and follow ${link}` : link;
  }

  private async resolvePath(value: string, from: string) {
    const rule = this.rules.files[from];
    if (rule?.external?.includes(value) || isExternal(value)) return;
    if (rule?.references?.[value]) return safePath(rule.references[value]);
    let path = value.split(/[?#]/)[0] ?? "";
    if (!path) return;
    if (path.startsWith("~/.claude/skills/gstack/"))
      path = `gstack/${path.slice("~/.claude/skills/gstack/".length)}`;
    else if (path.startsWith("crates/skillset/"))
      path = path.slice("crates/skillset/".length);
    else if (path.startsWith(skillDirectoryVariable)) {
      const owner = this.rows
        .filter((row) => from.startsWith(`${row.path}/`))
        .sort((a, b) => b.path.length - a.path.length)[0];
      if (!owner) throw new Error(`${from}: cannot resolve CLAUDE_SKILL_DIR`);
      path = `${owner.path}/${path.slice(skillDirectoryVariable.length)}`;
    } else {
      if (path.startsWith("/") || path.startsWith("~")) return;
      path = posix.normalize(posix.join(posix.dirname(from), path));
    }
    if (/\[[^\]]*\]/.test(path)) return;
    if (/[$*<>]/.test(path))
      throw new Error(
        `${from}: dynamic reference "${value}" needs an explicit extraction rule`,
      );
    safePath(path);
    const stat = await fs.lstat(join(this.repo, "crates/skillset", path), {
      throwIfNoEntry: false,
    });
    if (stat?.isDirectory()) path = `${path}/SKILL.md`;
    await this.sourceFile(path);
    return path;
  }

  private async rewrite(source: string, text: string) {
    const original = text;
    const rule = this.rules.files[source];
    for (const dependency of rule?.dependencies ?? []) this.require(dependency);
    for (const agent of rule?.agents ?? []) {
      this.agentRequests.set(agent.path, agent.kind);
      this.require(agent.path);
    }
    const replacements = new Map<string, string>();
    const literalRewrites = Object.entries(rule?.rewrites ?? {});
    for (const [token, replacement] of literalRewrites) {
      if (!text.includes(token))
        throw new Error(`${source}: stale rewrite rule "${token}"`);
      replacements.set(token, replacement);
    }
    const explicitlyRewritten = (token: string) =>
      literalRewrites.some(([original]) => original.includes(token));
    const addPath = async (token: string, required: boolean) => {
      if (
        replacements.has(token) ||
        explicitlyRewritten(token) ||
        rule?.external?.includes(token) ||
        isExternal(token)
      )
        return;
      try {
        const dependency = await this.resolvePath(token, source);
        if (dependency) {
          if (
            !source.endsWith(".md") &&
            /^(?:~|\$|crates\/skillset\/)/.test(token)
          )
            throw new Error(
              `${source}: runtime reference "${token}" needs an explicit rewrite and dependency extraction rule`,
            );
          const suffix = token.match(/[?#].*$/)?.[0] ?? "";
          replacements.set(
            token,
            relativeReference(
              this.destination(source),
              this.require(dependency),
            ) + suffix,
          );
        }
      } catch (error) {
        if (required) throw error;
      }
    };
    // Explicit mappings also cover runtime conventions and non-Markdown syntax.
    for (const [token, target] of Object.entries(rule?.references ?? {})) {
      if (!text.includes(token))
        throw new Error(`${source}: stale rewrite rule "${token}"`);
      replacements.set(
        token,
        relativeReference(this.destination(source), this.require(target)),
      );
    }
    for (const match of text.matchAll(
      /!?\[[^\]\n]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^)]*)?\s*\)/g,
    )) {
      await addPath(match[1] ?? "", true);
    }
    for (const match of text.matchAll(
      /^\s{0,3}\[[^\]\n]+\]:\s*<?([^\s>]+)>?/gm,
    ))
      await addPath(match[1] ?? "", true);
    for (const match of text.matchAll(
      /(?:~\/\.claude\/skills\/gstack\/|\$\{CLAUDE_SKILL_DIR\}\/|crates\/skillset\/)[^\s`"'();,]+/g,
    )) {
      await addPath(match[0], true);
    }
    for (const match of text.matchAll(
      /(?<![\w/])\$(?:\{[A-Za-z_]\w*\}|[A-Za-z_]\w*)\/[^\s`"'();,]+/g,
    )) {
      await addPath(match[0], true);
    }
    for (const match of text.matchAll(
      /\$\(dirname\s+["']?\$0["']?\)\/([^"'`\s)]+)/g,
    )) {
      this.require(
        posix.normalize(posix.join(posix.dirname(source), match[1] ?? "")),
      );
    }
    for (const match of text.matchAll(/`([^`\n]+)`/g)) {
      const token = match[1] ?? "";
      if (rule?.external?.includes(token)) continue;
      if (/^\$(?:\{[^}]+\}|[A-Z_]+)\//.test(token)) await addPath(token, true);
      if (
        /^(?:\.{1,2}\/)/.test(token) ||
        /^[\w.-]+(?:\/[\w.-]+)*\.[a-z0-9]+(?:#.*)?$/i.test(token)
      )
        await addPath(token, token.startsWith("./") || token.startsWith("../"));
    }
    // Static JS/TS module references. Runtime-computed dependencies use rules.
    for (const match of (/\.[cm]?[jt]sx?$/.test(source) ? text : "").matchAll(
      /(?:from\s+|import\s*\(|require\s*\()\s*["'](\.[^"']+)["']/g,
    )) {
      const token = match[1] ?? "";
      const path = posix.normalize(posix.join(posix.dirname(source), token));
      if (
        rule?.external?.includes(token) ||
        replacements.has(token) ||
        explicitlyRewritten(token)
      )
        continue;
      if (!(await fs.pathExists(join(this.repo, "crates/skillset", path)))) {
        const candidates = [
          path.replace(/\.js$/, ".ts"),
          `${path}.ts`,
          `${path}.js`,
          `${path}/index.ts`,
        ];
        const found = [];
        for (const candidate of new Set(candidates)) {
          if (
            await fs.pathExists(join(this.repo, "crates/skillset", candidate))
          )
            found.push(candidate);
        }
        const dependency = found[0];
        if (found.length !== 1 || !dependency)
          throw new Error(`${source}: unresolved module "${token}"`);
        let target = relativeReference(
          this.destination(source),
          this.require(dependency),
        );
        if (!target.startsWith(".")) target = `./${target}`;
        replacements.set(token, target);
      } else {
        let target = relativeReference(
          this.destination(source),
          this.require(path),
        );
        if (!target.startsWith(".")) target = `./${target}`;
        replacements.set(token, target);
      }
    }
    if (replacements.size) {
      const pattern = [...replacements.keys()]
        .sort((a, b) => b.length - a.length)
        .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");
      text = text.replace(
        new RegExp(pattern, "g"),
        (token) => replacements.get(token) ?? token,
      );
    }
    // Operative calls are rewritten separately from path references.
    text = text.replace(
      /Call the Skill tool (?:with|twice,\s*for)\s+((?:["`][^"`]+["`](?:\s*(?:,|and)\s*)?)+)/gi,
      (_all, names: string) =>
        [...names.matchAll(/["`]([^"`]+)["`]/g)]
          .map((match) => this.skillReference(match[1] ?? "", source, true))
          .join(". "),
    );
    text = text.replace(/`\/([a-z0-9-]+)`/g, (all, name: string) => {
      if (!this.rows.some((row) => row.name === name)) return all;
      return this.skillReference(name, source, false);
    });
    if (source.endsWith(".md") && (replacements.size || text !== original)) {
      text = `Resolve bundled relative paths against the directory containing this file; use absolute paths when running bundled scripts.\n\n${text}`;
    }
    return text;
  }

  async build() {
    for (const source of this.picks.keys()) this.require(source);
    while (this.pending.size) {
      const source = this.pending.values().next().value;
      if (source === undefined) break;
      this.pending.delete(source);
      if (this.seen.has(source)) continue;
      this.seen.add(source);
      const { content, mode } = await this.sourceFile(source);
      const destination = this.destination(source);
      let result = content;
      // Binary assets are byte-preserved; scripts retain their executable modes.
      let isText = !content.includes(0);
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(content);
      } catch {
        isText = false;
      }
      if (!isText && source.endsWith("/SKILL.md"))
        throw new Error(`Skill must be UTF-8 text: ${source}`);
      if (isText) {
        let text = content.toString();
        const pick = this.picks.get(source);
        if (source.endsWith("/SKILL.md")) {
          const { metadata, body } = frontmatter(text, source);
          text = await this.rewrite(source, body);
          if (pick)
            text = renderSkill(
              `---\n${Bun.YAML.stringify(metadata)}\n---\n${text}`,
              pick,
            );
        } else if (source.endsWith(".md") && /^---\r?\n/.test(text)) {
          const { metadata, body } = frontmatter(text, source);
          text = `---\n${Bun.YAML.stringify(
            metadata,
          )}\n---\n${await this.rewrite(source, body)}`;
        } else text = await this.rewrite(source, text);
        result = Buffer.from(text);
        if (pick) {
          const codexSource = `${pick.path}/agents/openai.yaml`;
          let codex: Record<string, unknown> = {};
          if (
            await fs.pathExists(join(this.repo, "crates/skillset", codexSource))
          ) {
            const parsed = Bun.YAML.parse(
              (await this.sourceFile(codexSource)).content.toString(),
            );
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
              throw new Error(`Invalid Codex metadata: ${codexSource}`);
            codex = parsed as Record<string, unknown>;
          }
          const ui: Record<string, unknown> = {
            ...(codex.interface && typeof codex.interface === "object"
              ? codex.interface
              : {}),
            display_name: pick.new_name || pick.name,
            short_description: pick.new_description || pick.description,
          };
          for (const field of ["icon_small", "icon_large"]) {
            const icon = ui[field];
            if (typeof icon !== "string") continue;
            const dependency = await this.resolvePath(icon, source);
            if (dependency)
              ui[field] = relativeReference(
                destination,
                this.require(dependency),
              );
          }
          if (typeof ui.default_prompt === "string") {
            ui.default_prompt = ui.default_prompt.replace(
              /\$([a-z0-9-]+)/g,
              (token, name: string) =>
                name === pick.name ? `$${pick.new_name || pick.name}` : token,
            );
          }
          codex.interface = ui;
          codex.policy = {
            ...(codex.policy && typeof codex.policy === "object"
              ? codex.policy
              : {}),
            allow_implicit_invocation: true,
          };
          this.files.set(
            `${dirname(destination)}/agents/openai.yaml`,
            textFile(Bun.YAML.stringify(codex)),
          );
        }
      }
      if (this.files.has(destination))
        throw new Error(`Output collision: ${destination}`);
      this.files.set(destination, { kind: "file", content: result, mode });
    }
    const agentNames = new Set<string>();
    for (const [source, kind] of this.agentRequests) {
      const path = this.destination(source);
      const file = this.files.get(path);
      if (file?.kind !== "file")
        throw new Error(`Missing agent output: ${source}`);
      const text =
        kind === "profile"
          ? trimAgentProfile(file.content.toString())
          : renderReviewer(basename(source, ".md"), file.content.toString());
      validateAgentProfile(text);
      const name = String(frontmatter(text, source).metadata.name);
      if (agentNames.has(name))
        throw new Error(`Duplicate agent name: ${name}`);
      agentNames.add(name);
      this.files.set(path, textFile(text));
    }
    return {
      files: this.files,
      skills: [...this.picks.keys()]
        .map((source) => `./${dirname(this.destination(source))}`)
        .sort(),
      agents: this.agentRequests,
    };
  }
}
