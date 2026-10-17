# Curate the shipped skill set through a reviewed pick list, not glob discovery

The plugin now draws on four suites under `crates/skillset/` (Glass's own plus the mattpocock, gstack, and impeccable submodules), and upstream trees carry skills we do not want to ship: fixtures, per-harness duplicates, OpenClaw variants, and buckets upstream itself does not promote. Until now the manifest was derived from hard-coded glob patterns per suite (`crates/skillset/glass/engineering/*`, `crates/skillset/gstack/*`, ...), so every upstream addition shipped automatically and every exclusion needed a new pattern.

We decided to curate instead: `bun run index-skills` indexes every `SKILL.md` across the suites into `crates/skillset/skillset/skillset/skills.csv`, and a human reviews each row, marking it `picked` or `skipped` and optionally giving it a new category or name. Only `picked` rows ship; a downstream generator materialises them under `crates/skillset/skillset/skillset/skillset/<category>/<name>`, inside the dedicated `skillset/` output directory beside the tooling. This gives installers that fetch without submodules a committed copy to load.

## Considered options

- Keep glob discovery and grow an exclusion list. Rejected: every submodule bump could silently ship a new upstream skill, and the exclusion list would end up as long as the pick list without recording why.
- Hand-maintain `.claude-plugin/plugin.json`. Rejected: no record of what was reviewed and rejected, so the same upstream skill gets re-evaluated on every bump.
- Automatically expose every skill needed by a Pick. Rejected: dependencies would expand the discoverable skill set beyond the reviewed Picks. Unpicked dependencies instead ship as support Markdown, with callers rewritten to read it rather than invoke a skill.
- Use a model to repair references during extraction. Rejected: identical inputs must produce identical output. Extraction resolves known references mechanically and reports ambiguous ones for explicit resolution.

## Consequences

- Required supporting files, including scripts and assets, must be copied out of the source submodules into the committed output, with references updated to their generated locations. Installed skills cannot rely on the source submodules being present. Extraction follows local dependencies recursively and fails on unresolved local dependencies; external installations remain explicit prerequisites.
- Support material lives under `crates/skillset/skillset/skillset/skillset/infra/<suite>/<source-relative-path>`, shared across Picks while preserving the source directory structure. Unpicked skill bodies are named `instructions.md` instead of `SKILL.md`. The `infra` category is reserved for support material.
- Final Pick names must be globally unique, even across categories. Frontmatter and references follow the final names; collisions and ambiguous references are errors.
- Explicit, checked-in dependency and rewrite rules supplement automatic reference detection, including conventions that construct paths dynamically. Recognized but unresolved references fail extraction. Representative extracted skills must be validated without the source submodules present.
- Generated-file ownership is tracked. Extraction removes obsolete generated files when Picks are removed, skipped, or renamed, and removes support material no remaining Pick needs. It preserves unrelated files and stops if a generated file has been manually edited; durable edits belong in sources or CSV overrides.
- Subagent profiles are dependencies too. Only profiles needed by Picks or their support material are shipped and registered, retaining the existing conversion to the shared Claude Code and Devin format.
- Plugin entries and repository-local discovery links will load the generated Picks. Validation must enforce agreement between the reviewed Picks, generated output, and discovery configuration.
- `bun run extract-skills` regenerates Picks, support material, required agent profiles, plugin entries, and local discovery links together. Its `--check` mode verifies those outputs without writing and is included in `bun run check`. Extraction requires a current CSV and reports when `index-skills` must run rather than refreshing it silently.
- Extraction resolves and validates the complete result before changing files. A validation failure leaves existing output untouched and reports diagnostics. An empty set of Picks is valid and removes only previously generated content.
- Generated Picks allow both model and explicit user invocation. Extraction removes user-only restrictions, normalizes Devin invocation metadata, and enables implicit invocation in Codex metadata while preserving workflow confirmation steps and prerequisites. The effective CSV description is used exactly, without automatic prose rewriting.
- A submodule bump surfaces new upstream skills as `new` rows; `bun run check` fails only when the csv is stale, not while rows await review, so reviewing is a human step rather than a CI gate.
- Human columns (`status`, `new_category`, `new_name`, and `new_description`) survive re-runs; script columns (`path`, `category`, `name`, `description`, `url`) are rewritten from disk every run. A blank override uses the upstream value. An upstream path move shows as `deleted` plus `new`, and the pick has to be re-made.
- Picks accumulate in the csv, so switching back to glob discovery later means discarding that review history.
