---
"glass-skills": minor
---

Ship gstack through the plugin: `.claude-plugin/plugin.json` now lists the vendored `gstack` router and every gstack skill, plus eight review subagents (`<name>-reviewer`) generated from gstack's review specialists into `agents/`. `bun run gstack-agents` regenerates them and `bun run check` keeps the manifest and agents in sync with the vendored tree. impeccable's plugin (one skill, four agents) is listed the same way, straight from the vendored `impeccable/plugin/`. Both are committed as plain files rather than git submodules so plugin installers that clone without submodules get them.
