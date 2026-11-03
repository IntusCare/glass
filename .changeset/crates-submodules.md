---
"glass-skills": minor
---

Ship [gstack](https://github.com/garrytan/gstack) and [impeccable](https://github.com/pbakaus/impeccable) through the plugin as git submodules at `crates/gstack` and `crates/impeccable`, each tracking upstream `main`, and move glass's own skills workspace from `skills/` to `crates/skillset/`. `.claude-plugin/plugin.json` lists the gstack router, every gstack skill, and impeccable's skill at their `./crates/...` paths, plus eight `<name>-reviewer` subagents generated from gstack's review specialists and trimmed copies of impeccable's four agents, all written to `agents/` by `bun run agents`. `bun run check` keeps the manifest and agents in sync with the submodule trees. Run `git submodule update --init` after cloning. Known limit: Devin reads gstack's `triggers` frontmatter as an invocation policy and hides those skills until upstream drops the key.
