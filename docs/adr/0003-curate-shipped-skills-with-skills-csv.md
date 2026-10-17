# Curate the shipped skill set through a reviewed pick list, not glob discovery

The plugin now draws on four suites under `crates/skillset/` (Glass's own plus the mattpocock, gstack, and impeccable submodules), and upstream trees carry skills we do not want to ship: fixtures, per-harness duplicates, OpenClaw variants, and buckets upstream itself does not promote. Until now the manifest was derived from hard-coded glob patterns per suite (`crates/skillset/glass/engineering/*`, `crates/skillset/gstack/*`, ...), so every upstream addition shipped automatically and every exclusion needed a new pattern.

We decided to curate instead: `bun run index-skills` indexes every `SKILL.md` across the suites into `crates/skillset/skillset/skillset/skills.csv`, and a human reviews each row, marking it `picked` or `skipped` and optionally giving it a new category or name. Only `picked` rows ship; a downstream generator materialises them under `crates/skillset/skillset/<category>/<name>`, which also gives installers that fetch without submodules a committed copy to load.

## Considered options

- Keep glob discovery and grow an exclusion list. Rejected: every submodule bump could silently ship a new upstream skill, and the exclusion list would end up as long as the pick list without recording why.
- Hand-maintain `.claude-plugin/plugin.json`. Rejected: no record of what was reviewed and rejected, so the same upstream skill gets re-evaluated on every bump.

## Consequences

- A submodule bump surfaces new upstream skills as `new` rows; `bun run check` fails only when the csv is stale, not while rows await review, so reviewing is a human step rather than a CI gate.
- Human columns (`status`, `new_category`, `new_name`) survive re-runs; script columns (`path`, `category`, `name`, `description`, `url`) are rewritten from disk every run. An upstream path move shows as `deleted` plus `new`, and the pick has to be re-made.
- Picks accumulate in the csv, so switching back to glob discovery later means discarding that review history.
