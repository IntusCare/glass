Glass's own skills live in the `glass-skills` workspace at `crates/skillset/glass/`. Matt Pocock's upstream skills live in the unmodified `crates/skillset/mattpocock` submodule, under `skills/`. Both use bucket folders:

- `engineering/`: daily code work
- `productivity/`: daily non-code workflow tools
- `misc/`: kept around but rarely used, not promoted
- `in-progress/`: beta: public on purpose, feedback wanted, not shipped in the plugin
- `deprecated/`: no longer used

The reviewed `skills.csv` selects what ships, regardless of source bucket. Only `picked` rows become discoverable skills. `bun run extract-skills` generates their copies, plugin entries, required agent profiles, and local discovery links together. See [extraction workflow](./docs/extract-skills.md) and [ADR 0003](./docs/adr/0003-curate-shipped-skills-with-skills-csv.md).

Install commands are copied verbatim from [.agents/install-block.md](./.agents/install-block.md). `.claude-plugin/marketplace.json` makes the repo its own single-plugin marketplace (a fallback the install block explains, not the documented route). Run `claude plugin validate . --strict` after touching either manifest. Why a Claude plugin but not (yet) a Codex one lives in [.agents/adr/0002-ship-as-a-claude-code-plugin.md](./.agents/adr/0002-ship-as-a-claude-code-plugin.md).

Each skill entry in the top-level `README.md` must link the skill name to its `SKILL.md`.

## Third-party skill suites

`crates/skillset/` holds the source suites. `glass/` is Glass's own workspace, retaining `workon` and the plugin release version and changelog. `mattpocock`, `gstack`, and `impeccable` are git submodules tracking upstream `main`, declared in `.gitmodules`; nothing under them is edited here. Contributors and CI initialize submodules to index, extract, and check. Installed skills load committed output under `crates/skillset/skillset/skillset/skillset/` and do not need submodules. After a submodule update, run `bun run index-skills`, review the CSV, then `bun run extract-skills`. Commit the new gitlinks, CSV, and generated changes.

### mattpocock

[mattpocock/skills](https://github.com/mattpocock/skills) is the submodule at `crates/skillset/mattpocock`. Preserve its source metadata, including user-only skills. Extraction normalizes invocation only in generated Picks. Its package is not a Bun workspace: release tooling must never version the upstream checkout.

The extractor copies required support material and rewrites local references. Unpicked skill dependencies become `instructions.md` under the reserved `infra/` category, without discovery entries. Devin's generated `triggers` list contains `model` and `user`, rather than upstream example phrases.

### gstack

[garrytan/gstack](https://github.com/garrytan/gstack) is the submodule at `crates/skillset/gstack`. Picks and their required dependencies are copied out of it. Dynamic runtime paths require explicit dependency or rewrite rules; see the extraction workflow.

Required gstack review checklists become `<name>-reviewer` agent profiles under generated `infra/`, registered in the plugin's `agents` array. The renderer and its description map live in `scripts/agents.ts`. Copied upstream prose is exempt from the no-em-dash rule. Never edit generated files by hand: update source or extraction rules, then run `bun run extract-skills`. `bun run agents` is an alias for that same extraction.

Every agent profile must load in both Claude Code and Devin, whose [custom subagent format](https://docs.devinenterprise.com/cli/subagents#custom-subagents) is the stricter one: frontmatter holds only `name`, `description`, and `tools` as a YAML list (no `model`, `effort`, or `maxTurns`). `bun run check` enforces this.

Local discovery exposes only generated Picks, from any suite. Copied helpers must resolve within the generated tree. External binaries and services remain explicit runtime prerequisites; extraction never runs upstream commands or installs runtimes.

### impeccable

[pbakaus/impeccable](https://github.com/pbakaus/impeccable) is the submodule at `crates/skillset/impeccable`. Pick its source under `plugin/`, rather than provider-specific copies. Required profiles are copied into generated `infra/` with frontmatter trimmed to the shared agent format. Upstream's hooks and nested plugin manifests are not automatically shipped.

Each owned source bucket has a `README.md` listing its skills. The top-level README lists the current Picks with links to generated `SKILL.md` files under **Model-invoked**. Upstream READMEs remain unmodified.

Glass skills in promoted buckets have a human-facing page at `docs/<bucket>/<skill-name>.md`. When changing one, re-sync its page following [.agents/writing-docs.md](./.agents/writing-docs.md). For upstream skills, `crates/skillset/mattpocock/docs/` and the upstream skill source are authoritative; the root docs retain the earlier Glass fork's descriptions. Non-promoted skills get no docs page.

Generated Picks are model-invoked and user-reachable. Upstream source policies remain untouched. See [.agents/invocation.md](./.agents/invocation.md).

[`ask-matt`](./crates/skillset/mattpocock/skills/engineering/ask-matt/SKILL.md) routes the upstream suite. It is maintained upstream; record Glass-specific routes in this repo's README rather than editing the submodule.

`.devin/skills` links to generated Picks, with `.agents/skills` and `.claude/skills` pointing there. `bun run link-skills` aliases the full extractor so discovery cannot drift from generated content. Edit owned sources or CSV overrides, then regenerate. Extraction tracks generated ownership, preserves unrelated files, and stops on edited generated files. The older `scripts/link-skills.sh` changes global installations; it is not the repository-local setup.

No em-dashes anywhere in this repo's prose (`SKILL.md` files, docs, `README.md`, `CHANGELOG.md`, ADRs, changesets, code comments). Where a sentence reaches for one, rewrite it instead with a comma, colon, period, parentheses, or a conjunction, whichever the sentence actually wants; never do a blind character substitution.

## Monorepo tooling

Import specifiers may contain at most one `../` segment. Use workspace package exports or configured aliases for deeper imports.

Use Bun for dependency installation and scripts. Run `bun run check` to verify formatting, lint, TypeScript, builds, tests, and promoted-skill manifest entries. Run `bun run check-plugin-version` separately before releasing.

The root package orchestrates workspaces. `crates/skillset/glass/package.json` owns the plugin release version under the `glass-skills` package name so existing changesets still resolve. Release tooling lives in the private `@glass/scripts` workspace. New applications and libraries go under `apps/*` and `packages/*`; their TypeScript configs extend the root `tsconfig.json`.

### Skill index

`crates/skillset/skillset/skillset/skills.csv` is the reviewed pick list for the plugin: one row per skill found under `crates/skillset/<suite>/` (every suite except `skillset` itself, skipping dot-directories, `node_modules`, and `test`/`tests`/`fixtures` paths, and symlink aliases). `bun run index-skills` regenerates it; the `@glass/skillset` workspace's `check` script runs the same indexer with `--check`, so `bun run check` fails when the csv is stale (after a submodule bump, run `bun run index-skills` and commit the result). Columns, sorted by `path`:

- Script-owned, rewritten every run: `path` (relative to `crates/skillset/`), `category` (the skill directory's parent folder, or the suite name when the parent is the suite root or a folder named `skills`), `name` (frontmatter `name`, else the directory name), `description`, and `url` (frontmatter `url` or `homepage`, else a per-suite rule: mattpocock skills with an upstream docs page link to `https://aihero.dev/skills-<name>`, Glass skills with a `docs/<category>/<name>.md` page link to it on GitHub, impeccable links to `https://impeccable.style`, and anything without a doc page is left blank).
- Human-owned, preserved verbatim: `new_category`, `new_name`, and `new_description` (blank means use the source value) and `status` once it is `picked` or `skipped`. The script sets `new` for a skill not yet in the csv (or one that came back after being `deleted`) and `deleted` for a row whose skill is gone from disk; delete those rows by hand once you have seen them. `new` rows are allowed by `check`: reviewing is a human step.

Only `picked` rows are meant to ship; why the set is curated this way is in [docs/adr/0003-curate-shipped-skills-with-skills-csv.md](./docs/adr/0003-curate-shipped-skills-with-skills-csv.md).

Markdown files are importable. Bun's default `md` loader renders them to HTML, so add `with { type: "text" }` to get the raw Markdown string: `import readme from "../README.md" with { type: "text" };`. Either way the import is a `string`, typed by `types/markdown.d.ts`, which the root `tsconfig.json` includes for every workspace. See `scripts/markdown-import.test.ts`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical names, unchanged. See `docs/agents/triage-labels.md`. Issues are judged against [`SCOPE.md`](./SCOPE.md).

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.

# Scripts

Never write a bash script longer than one line. Instead use bun and zx. [crates/skillset/skillset/skillset/index-skills.ts](./crates/skillset/skillset/skillset/index-skills.ts) is the example: an executable `.ts` file (`#!/usr/bin/env bun` shebang, `chmod +x`) that imports `fs` from `zx`, exports its logic for `bun test`, and runs as a CLI under `if (import.meta.main)`.