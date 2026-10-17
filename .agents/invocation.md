# Skill invocation

Generated Picks under `crates/skillset/skillset/skillset/` are **model-invoked**: reachable automatically and explicitly. Upstream submodules preserve their original policies. Extraction normalizes metadata only in the generated copies.

- Omit `disable-model-invocation` from frontmatter and `policy.allow_implicit_invocation: false` from `agents/openai.yaml`.
- Keep the `description` model-facing: state the skill's job and the distinct situations that should trigger it. Explicit invocation remains available through the harness's skill picker or command syntax.
- Keep `interface.display_name` and `interface.short_description` in `agents/openai.yaml` for the Codex picker.
- Preserve each workflow's confirmation gates and prerequisites. Automatic selection does not authorize unrelated work, skip a human decision, or remove tool permission checks.

These authoring rules apply to Glass-owned source skills. Generated Picks also set Devin's `triggers` to `[model, user]`, allow explicit invocation, and enable Codex implicit invocation. Descriptions use `new_description` when supplied, otherwise the indexed source description.

## Dependencies between skills

Dependencies are expressed as an explicit instruction to **call the Skill tool** with the named skill (`Call the Skill tool with "grilling"`), not deep `../other-skill/FILE.md` cross-references or a bare `/name` left for the model to interpret. Shared reference docs live inside the skill that owns them; other skills reach that material by calling the owning skill.

The Skill tool takes one skill per call. A step that needs two skills is two calls: say `Call the Skill tool twice, for "grilling" and "domain-modeling"`.

Router prose naming a workflow is guidance, not permission to execute it. Extraction rewrites calls to unpicked dependencies into instructions to read their support Markdown. References to Picks use their final names. Workflow stop and confirmation points still apply.

## Repository-local discovery

`.devin/skills/<name>` links to a generated Pick. `.agents/skills` and `.claude/skills` link to `.devin/skills` for Codex and Claude Code compatibility. All links are relative. Initialize submodules before regenerating, but installed output can load without them.

Run `bun run extract-skills` after changing Picks, overrides, reference rules, or source content. `bun run link-skills` and `bun run agents` are aliases for this command. Commit the output and links together. `bun run check` detects stale output and discovery configuration; extraction refuses to overwrite manually edited generated files.

Fresh checkouts require Git symlink support. If a harness does not notice changes during a session, restart it. Existing global or plugin installations are untouched; duplicate names follow the harness's resolution rules, so inspect the source path when testing a local edit.

## Passive vs active domain work

Merely _reading_ `GLOSSARY.md` for vocabulary is a one-line prose pointer, not the `domain-modeling` skill. Only the active build/sharpen discipline (challenge terms, edge-case scenarios, write ADRs, update `GLOSSARY.md` inline) is `domain-modeling`.
