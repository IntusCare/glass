Picks live at `crates/skillset/skillset/<category>/<name>/SKILL.md`, grouped by category folders (`all`, `doc`, `eng`, `meta`, `ui`). Glass-owned skills like `eng/workon` are authored there directly. The upstream suites [mattpocock/skills](https://github.com/mattpocock/skills), [garrytan/gstack](https://github.com/garrytan/gstack), and [pbakaus/impeccable](https://github.com/pbakaus/impeccable) are installed on the machine by [`crates/skillset/skillset/setup.sh`](./crates/skillset/skillset/setup.sh), not vendored; nothing of theirs is copied into this repo. A stub Pick forwards to its upstream invocation: `Invoke \`/<suite>:<skill>\` with the user's arguments and do nothing else.`

The reviewed [`skills.csv`](./crates/skillset/skillset/skills.csv) selects what ships. It is hand-maintained: set `status` to `picked` and optionally override `new_category`, `new_name`, or `new_description`. Workflow:

1. Edit `skills.csv`.
2. From `crates/skillset`, run `bun run skillset.pick` to write stubs for picked rows that lack a `SKILL.md`. `pick-skills.ts` never overwrites an existing file, so edit or delete a stub by hand to change it.
3. Run `bun run skillset.index` to regenerate `.claude-plugin/plugin.json`, the `.devin/skills` links, and the README's Model-invoked block.
4. Commit the stubs and regenerated metadata together. `bun run check` fails when any of them are stale.

Install commands are copied verbatim from [.agents/install-block.md](./.agents/install-block.md). `.claude-plugin/marketplace.json` makes the repo its own single-plugin marketplace (a fallback the install block explains, not the documented route). Run `claude plugin validate . --strict` after touching either manifest. Why a Claude plugin but not (yet) a Codex one lives in [.agents/adr/0002-ship-as-a-claude-code-plugin.md](./.agents/adr/0002-ship-as-a-claude-code-plugin.md).

Each skill entry in the top-level `README.md` must link the skill name to its `SKILL.md`.

`.devin/skills/<name>` links to each Pick, with `.agents/skills` and `.claude/skills` pointing there; `bun run skillset.index` keeps them in sync so discovery cannot drift from the Picks.

Picks are model-invoked and user-reachable. See [.agents/invocation.md](./.agents/invocation.md).

Glass skills have a human-facing page at `docs/<category>/<skill-name>.md`. When changing one, re-sync its page following [.agents/writing-docs.md](./.agents/writing-docs.md).

No em-dashes anywhere in this repo's prose (`SKILL.md` files, docs, `README.md`, `CHANGELOG.md`, ADRs, changesets, code comments). Where a sentence reaches for one, rewrite it instead with a comma, colon, period, parentheses, or a conjunction, whichever the sentence actually wants; never do a blind character substitution.

## Monorepo tooling

Import specifiers may contain at most one `../` segment. Use workspace package exports or configured aliases for deeper imports.

Use Bun for dependency installation and scripts. Run `bun run check` to verify formatting, lint, TypeScript, builds, tests, and Pick metadata. Run `bun run check-plugin-version` separately before releasing.

The root package orchestrates workspaces. `crates/skillset/package.json` owns the plugin release version under the `glass-skills` package name so existing changesets still resolve; `CHANGELOG.md` lives beside it. Release tooling lives in the private `@glass/scripts` workspace. New applications and libraries go under `apps/*` and `packages/*`; their TypeScript configs extend the root `tsconfig.json`.

Markdown files are importable. Bun's default `md` loader renders them to HTML, so add `with { type: "text" }` to get the raw Markdown string: `import readme from "../README.md" with { type: "text" };`. Either way the import is a `string`, typed by `types/markdown.d.ts`, which the root `tsconfig.json` includes for every workspace. See `scripts/markdown-import.test.ts`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical names, unchanged. See `docs/agents/triage-labels.md`. Issues are judged against [`SCOPE.md`](./SCOPE.md).

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.

# Scripts

Never write a bash script longer than one line. Instead use bun and zx. [crates/skillset/skillset/pick-skills.ts](./crates/skillset/skillset/pick-skills.ts) is the example: an executable `.ts` file (`#!/usr/bin/env bun` shebang, `chmod +x`) that imports `fs` from `zx`, exports its logic for `bun test`, and runs as a CLI under `if (import.meta.main)`.
