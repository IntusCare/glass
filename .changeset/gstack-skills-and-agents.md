---
"glass-skills": minor
---

Ship gstack through the plugin: `.claude-plugin/plugin.json` now lists the `gstack` submodule's router and every gstack skill, plus eight review subagents (`<name>-reviewer`) generated from gstack's review specialists into `agents/`. `bun run gstack-agents` regenerates them and `bun run check` keeps the manifest and agents in sync with the submodule.
