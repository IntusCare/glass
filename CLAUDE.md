Skills are organized into bucket folders under `skills/`:

- `engineering/`: daily code work
- `productivity/`: daily non-code workflow tools
- `misc/`: kept around but rarely used, not promoted
- `in-progress/`: beta: public on purpose, feedback wanted, not shipped in the plugin
- `deprecated/`: no longer used

Every skill in `engineering/` or `productivity/` (the **promoted** buckets) must have a reference in the top-level `README.md` and an entry in `.claude-plugin/plugin.json`'s `skills` array (the Claude Code plugin ships exactly the promoted set). Skills in `misc/`, `in-progress/`, and `deprecated/` must not appear in either.

Install commands are copied verbatim from [.agents/install-block.md](./.agents/install-block.md). `.claude-plugin/marketplace.json` makes the repo its own single-plugin marketplace (a fallback the install block explains, not the documented route). Run `claude plugin validate . --strict` after touching either manifest. Why a Claude plugin but not (yet) a Codex one lives in [.agents/adr/0002-ship-as-a-claude-code-plugin.md](./.agents/adr/0002-ship-as-a-claude-code-plugin.md).

Each skill entry in the top-level `README.md` must link the skill name to its `SKILL.md`.

## gstack

[garrytan/gstack](https://github.com/garrytan/gstack) is vendored as plain files under `gstack/` (its root `SKILL.md`, `README.md`, `LICENSE`, `NOTICE.md`, `VERSION`, and every skill directory; upstream `test/`, `fixtures/`, and `dist/` subtrees and the `connect-chrome` symlink alias are dropped) and shipped through the same plugin. Not a submodule: plugin installers clone without submodules, so anything the manifest points at has to be committed here. `.claude-plugin/plugin.json` lists `./gstack` (its router skill) and every `./gstack/<name>` directory that holds a `SKILL.md`, and `bun run check` requires that list to match the tree exactly. To upgrade, copy the new upstream tree in the same shape (the `VERSION` file records which), run `bun run vendored-skills`, re-sync that list, and regenerate the agents.

Upstream gstack `SKILL.md` frontmatter carries a `triggers` list of example phrases. Devin reads a `triggers` key as the skill's invocation policy (it expects `model` and `user`), so a skill with phrases there is hidden from the agent. `bun run vendored-skills` strips that key from every vendored skill and `bun run check` fails while any remains; the rest of the frontmatter (`preamble-tier`, `version`, `allowed-tools`, `hooks`) stays upstream's.

`agents/*.md` are subagent profiles generated from `gstack/review/specialists/*.md`: one `<name>-reviewer` per checklist, listed in `plugin.json`'s `agents` array. Never edit them by hand; change the description map in `scripts/gstack-agents.ts` or update the vendored checklists, then run `bun run gstack-agents`. `bun run check` fails when they are stale. The checklist text inside them is gstack's verbatim, so the no-em-dash rule below does not apply to those copied sections.

Every agent profile (generated or vendored) must load in both Claude Code and Devin, whose [custom subagent format](https://docs.devinenterprise.com/cli/subagents#custom-subagents) is the stricter one: frontmatter holds only `name`, `description`, and `tools` as a YAML list (no `model`, `effort`, or `maxTurns`). `bun run check` enforces this.

gstack skills are not linked into `.devin/skills`, are not routed by `ask-matt` (gstack ships its own `/gstack` router), and get no docs page. Their `SKILL.md` files expect gstack's `./setup` to have installed `~/.claude/skills/gstack/bin`; without it they run in gstack's documented degraded mode.

## impeccable

[pbakaus/impeccable](https://github.com/pbakaus/impeccable) ships a real Claude plugin under `plugin/` in its repo; that directory's `skills/` and `agents/` are vendored as plain files under `impeccable/plugin/` (plus the upstream `LICENSE`), and the manifest points straight into it: `./impeccable/plugin/skills/impeccable` in `skills` and the four `./impeccable/plugin/agents/*.md` in `agents`. `bun run check` requires the manifest to list exactly what that tree contains. Upstream's `hooks/hooks.json` and nested `.claude-plugin/` are not vendored. The agent files are upstream's with the frontmatter trimmed to the shared agent format above; keep that trim when upgrading. Take the copy from upstream `plugin/`, never `.claude/` (that copy hard-codes `.claude/skills/impeccable/scripts` paths).

Each bucket folder has a `README.md` that lists every skill in the bucket with a one-line description, with the skill name linked to its `SKILL.md`. The promoted buckets' `README.md`s and the top-level `README.md` list skills under **Model-invoked**; non-promoted bucket `README.md`s (`misc/`, `in-progress/`) use a flat list.

Skills in `engineering/` and `productivity/` also have a human-facing docs page at `docs/<bucket>/<skill-name>.md` (the docs tree mirrors those two bucket folders under `skills/`). The published URL is `https://aihero.dev/skills-<skill-name>` regardless of bucket: the docs path is repo organisation only. When you add, rename, or change the behaviour of a skill in `engineering/` or `productivity/`, create or re-sync its docs page following [.agents/writing-docs.md](./.agents/writing-docs.md). A finished page carries four sections: **What it does**, **When to reach for it**, **Common questions**, and **It's working if**. `writing-docs.md` holds the template, the section order, and where to hunt for the questions. Skills in the non-promoted buckets (`misc/`, `in-progress/`, `deprecated/`) get **no** docs page. The one exception is a promoted skill removed outright: its page stays, marked archived (see `writing-docs.md`).

Every `SKILL.md` is model-invoked and user-reachable. Keep descriptions trigger-focused and omit user-only restrictions from frontmatter and `agents/openai.yaml`. See [.agents/invocation.md](./.agents/invocation.md).

[`ask-matt`](./skills/engineering/ask-matt/SKILL.md) is the router that maps every user-reachable skill and how they relate. The same trigger that re-syncs a docs page applies to it: whenever you add, rename, remove, or change how a user-reachable skill fits the flows, re-read `ask-matt`'s `SKILL.md` and update it so the map stays accurate: a new skill it never mentions, or a stale one it still routes to, is a router that lies.

All buckets are available inside this checkout through relative symlinks in `.devin/skills`, with `.agents/skills` and `.claude/skills` pointing to that directory. After adding, removing, renaming, or moving a skill, run `bun run link-skills` and include the link changes with the source changes. `bun run check` validates links and invocation metadata. Edit sources under `skills/`, not installed plugin caches. The older `scripts/link-skills.sh` changes global installations; it is not the repository-local setup.

No em-dashes anywhere in this repo's prose (`SKILL.md` files, docs, `README.md`, `CHANGELOG.md`, ADRs, changesets, code comments). Where a sentence reaches for one, rewrite it instead with a comma, colon, period, parentheses, or a conjunction, whichever the sentence actually wants; never do a blind character substitution.

## Monorepo tooling

Use Bun for dependency installation and scripts. Run `bun run check` to verify formatting, lint, TypeScript, builds, tests, and promoted-skill manifest entries. Run `bun run check-plugin-version` separately before releasing.

The root package orchestrates workspaces. `skills/package.json` owns the plugin release version under the `glass-skills` package name so existing changesets still resolve. Release tooling lives in the private `@glass/scripts` workspace. New applications and libraries go under `apps/*` and `packages/*`; their TypeScript configs extend the root `tsconfig.json`.

Markdown files are importable. Bun's default `md` loader renders them to HTML, so add `with { type: "text" }` to get the raw Markdown string: `import readme from "../README.md" with { type: "text" };`. Either way the import is a `string`, typed by `types/markdown.d.ts`, which the root `tsconfig.json` includes for every workspace. See `scripts/markdown-import.test.ts`.

## Agent skills

### Triage labels

Canonical names, unchanged. See `docs/agents/triage-labels.md`. Issues are judged against [`SCOPE.md`](./SCOPE.md).

# Scripts

Never write a bash script longer than one line. Instead use bun and zx.

TODO Example