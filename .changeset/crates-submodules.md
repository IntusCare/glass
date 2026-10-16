---
"glass-skills": minor
---

Replace the vendored gstack and impeccable trees with git submodules at `crates/gstack` and `crates/impeccable`, each tracking upstream `main`, and move glass's own skills workspace from `skills/` to `crates/skillset/`. The plugin manifest now points at `./crates/...` paths; the review subagents and trimmed copies of impeccable's four agents are generated into `agents/` by `bun run agents` (replacing `bun run gstack-agents` and `bun run vendored-skills`). Run `git submodule update --init` after cloning.
