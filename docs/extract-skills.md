# Extracting the curated Skillset

`skills.csv` selects the plugin's discoverable entry points. Sources live under `crates/skillset/<suite>/`; tooling and the CSV live under `crates/skillset/skillset/skillset/`. Generated output goes in that directory's `skillset/` subdirectory. See [ADR 0003](./adr/0003-curate-shipped-skills-with-skills-csv.md) for the design decisions.

## Updating the bundle

1. Initialize or update source submodules.
2. Run `bun run index-skills` to refresh source-owned CSV columns.
3. Mark rows `picked` or `skipped`. Optional `new_category`, `new_name`, and `new_description` overrides survive indexing; blank means use the indexed source value.
4. Run `bun run extract-skills`. It requires a current CSV and generates Picks, dependencies, required profiles, plugin entries, and local discovery together.
5. Run `bun run check` and commit the CSV, source updates, and generated output together.

`bun run extract-skills --check` verifies without writing. `bun run link-skills` and `bun run agents` alias the full extractor. Only the plugin's `skills` and `agents` fields are generated; version and other metadata stay under their existing tooling.

## Output and ownership

A Pick becomes `skillset/<category>/<name>/SKILL.md` relative to the tooling directory, with normalized Claude Code, Devin, and Codex invocation metadata. Names are unique across categories. Its effective description is copied exactly; workflow confirmation steps stay intact.

Support files live under `skillset/infra/<suite>/<source-relative-path>`. Unpicked skill bodies become `instructions.md`, with callers rewritten to read them. Picks remain Skill tool calls using their final names. Dependencies are shared and traversed recursively, including cycles. Required gstack specialist checklists and Impeccable profiles are converted to the shared agent format and registered; other profiles can be declared in rules.

`infra` is reserved and never linked as a skill. Keep the complete generated tree when installing: copying only a Pick's directory can discard shared dependencies. Source submodules are needed for regeneration, not for using the generated bundle.

`extracted.json`, beside the CSV, records generated file hashes, modes, links, and discovery entries. Extraction validates everything before writing. Missing output is regenerated; edited generated files stop extraction. Restore those files and put durable edits in Glass-owned source, CSV overrides, or rules. Upstream source submodules remain unmodified.

Renaming or unpicking removes obsolete generated files and unused dependencies. Zero Picks is valid. Unrelated files are preserved. On the first run, legacy source links and matching generated `agents/` files are migrated; a legacy agent that differs from its old generator's output blocks migration.

## Reference rules

Automatic detection handles Markdown links and reference definitions, known skill calls, slash-command references, existing backticked file paths, static relative JavaScript/TypeScript module imports, and shell helpers referenced through `$(dirname "$0")`. In Markdown, known gstack installation paths and `${CLAUDE_SKILL_DIR}` references are resolved to copied sources. URLs and fragment-only links remain external.

Add `extraction-rules.json` beside the CSV for conventions requiring explicit knowledge. Its `files` mapping uses paths relative to `crates/skillset/`:

```json
{
  "files": {
    "gstack/example/SKILL.md": {
      "references": {
        "$TOOLS/check": "gstack/bin/check"
      },
      "dependencies": ["gstack/scripts/runtime.json"],
      "skills": { "review": "gstack/review" },
      "external": ["GLOSSARY.md"],
      "agents": [
        {
          "path": "gstack/review/specialists/security.md",
          "kind": "gstack-reviewer"
        }
      ]
    }
  }
}
```

- `references` maps literal tokens in a file to source files. Each token must occur; the target is copied and the token becomes a relative generated path.
- `rewrites` maps exact text to replacement text when a runtime expression needs more than path substitution. For example, a shell rule can replace `"$TOOLS/helper.sh"` with `"$(dirname "$0")/helper.sh"` and declare that helper in `dependencies`. Every matched token must occur. Absolute or variable-based paths inside runtime code require this explicit adaptation so they cannot silently depend on the caller's working directory.
- `dependencies` includes files not discoverable from literal references, including runtime configuration, licenses, and notices. These files are scanned recursively too.
- `skills` resolves an invocation name to a specific source skill directory. Otherwise names resolve within the caller's suite first, then across suites; ambiguity fails.
- `external` names exact references to caller-project files, examples, or external prerequisites that must remain unchanged.
- `agents` includes required profiles. `profile` trims existing frontmatter; `gstack-reviewer` renders a known gstack specialist checklist. Profile dependencies are scanned recursively.

Unknown operative skill calls, missing required files, and recognized dynamic paths fail with the source location. Arbitrary shell, generated paths, and prose are not a statically decidable dependency language: review copied runtime code and declare its dependencies explicitly. The extractor does not execute upstream commands, fetch binaries, install dependencies, or invoke models.

## Validation

Tests exercise the extractor against disposable source suites, then remove those suites and run a copied script from another directory. Other fixtures cover recursive instruction dependencies, renames, profiles, binary assets, cleanup, stale inputs, manual edits, and path conflicts. This proves the tested extraction conventions; external services and full upstream workflows still need their own runtime validation when selected.
