# Skill invocation

Picks under `crates/skillset/skillset/` are **model-invoked**: reachable automatically and explicitly. Upstream suites are installed on the machine by `setup.sh` and keep their original policies; a stub Pick only forwards the invocation to `/<suite>:<skill>`.

- Omit `disable-model-invocation` from frontmatter and `policy.allow_implicit_invocation: false` from `agents/openai.yaml`.
- Keep the `description` model-facing: state the skill's job and the distinct situations that should trigger it. Explicit invocation remains available through the harness's skill picker or command syntax.
- Keep `interface.display_name` and `interface.short_description` in `agents/openai.yaml` for the Codex picker.
- Preserve each workflow's confirmation gates and prerequisites. Automatic selection does not authorize unrelated work, skip a human decision, or remove tool permission checks.

These authoring rules apply to Glass-owned skills. For stubs, `pick-skills.ts` uses `new_description` when supplied, otherwise the source description from `skills.csv`.

## Dependencies between skills

Dependencies are expressed as an explicit instruction to **call the Skill tool** with the named skill (`Call the Skill tool with "grilling"`), not deep `../other-skill/FILE.md` cross-references or a bare `/name` left for the model to interpret. Shared reference docs live inside the skill that owns them; other skills reach that material by calling the owning skill.

The Skill tool takes one skill per call. A step that needs two skills is two calls: say `Call the Skill tool twice, for "grilling" and "domain-modeling"`.

Router prose naming a workflow is guidance, not permission to execute it. Workflow stop and confirmation points still apply.

## Repository-local discovery

`.devin/skills/<category>-<name>` links to a Pick, matching the Pick's frontmatter `name` (`<category>-<name>`, enforced by `bun run check`). `.agents/skills` and `.claude/skills` link to `.devin/skills` for Codex and Claude Code compatibility. All links are relative.

Run `bun run skillset.index` from `crates/skillset` after changing Picks or `skills.csv`; it maintains the links, the plugin manifest, and the README block. `bun run check` fails when they drift.

Fresh checkouts require Git symlink support. If a harness does not notice changes during a session, restart it. Existing global or plugin installations are untouched; duplicate names follow the harness's resolution rules, so inspect the source path when testing a local edit.

## Passive vs active domain work

Merely _reading_ `GLOSSARY.md` for vocabulary is a one-line prose pointer, not the `domain-modeling` skill. Only the active build/sharpen discipline (challenge terms, edge-case scenarios, write ADRs, update `GLOSSARY.md` inline) is `domain-modeling`.
