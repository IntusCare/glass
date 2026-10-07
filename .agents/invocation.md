# Skill invocation

Every `SKILL.md` in this repo is **model-invoked**: reachable by the agent when the task fits and explicitly by the user. This applies to every bucket, including local-only and beta skills. Invocation eligibility is separate from which skills ship in the plugin.

- Omit `disable-model-invocation` from frontmatter and `policy.allow_implicit_invocation: false` from `agents/openai.yaml`.
- Keep the `description` model-facing: state the skill's job and the distinct situations that should trigger it. Explicit invocation remains available through the harness's skill picker or command syntax.
- Keep `interface.display_name` and `interface.short_description` in `agents/openai.yaml` for the Codex picker.
- Preserve each workflow's confirmation gates and prerequisites. Automatic selection does not authorize unrelated work, skip a human decision, or remove tool permission checks.

The promoted bucket READMEs and top-level README list their skills under **Model-invoked**. Non-promoted buckets use flat lists.

## Dependencies between skills

Dependencies are expressed as an explicit instruction to **call the Skill tool** with the named skill (`Call the Skill tool with "grilling"`), not deep `../other-skill/FILE.md` cross-references or a bare `/name` left for the model to interpret. Shared reference docs live inside the skill that owns them; other skills reach that material by calling the owning skill.

The Skill tool takes one skill per call. A step that needs two skills is two calls: say `Call the Skill tool twice, for "grilling" and "domain-modeling"`.

Router prose that names skills for a human to choose from is guidance, not an instruction to execute the whole flow. Keep `/skill` labels in that prose. All skills are eligible for cross-skill calls, but a workflow's explicit stop or confirmation point still applies.

## Repository-local discovery

`.devin/skills/<name>` links to `skills/<bucket>/<name>`. `.agents/skills` and `.claude/skills` link to `.devin/skills` for Codex and Claude Code compatibility. All links are relative, so a checkout can move without changing them. The source folders remain the only copies of skill content and supporting files.

Run `bun run link-skills` after adding, removing, renaming, or moving a skill. The command refreshes only repository-managed links and refuses to overwrite real files or unrelated symlinks. Commit the link changes with the source changes. `bun run check` detects missing or stale links, duplicate names, and invocation restrictions.

Fresh checkouts require Git symlink support. If a harness does not notice changes during a session, restart it. Existing global or plugin installations are untouched; duplicate names follow the harness's resolution rules, so inspect the source path when testing a local edit.

## Passive vs active domain work

Merely _reading_ `GLOSSARY.md` for vocabulary is a one-line prose pointer, not the `domain-modeling` skill. Only the active build/sharpen discipline (challenge terms, edge-case scenarios, write ADRs, update `GLOSSARY.md` inline) is `domain-modeling`.
