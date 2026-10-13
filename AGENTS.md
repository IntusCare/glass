# Maintaining Glass

These instructions apply only when the user's task is to maintain the Glass repository itself. When Glass is installed as a plugin in another project, use that project's repository instructions; the tooling, layout, and maintenance commands below do not apply to it.

Use Bun 1.4.3 for dependency installation and scripts. `mise.toml` pins the runtime; run `mise install` when setting up a checkout. `bunfig.toml` makes package scripts run JavaScript CLIs with Bun instead of Node. Use `bun install --frozen-lockfile` in CI.

Run `bun run check` before finishing changes; it checks Biome formatting and lint, then runs workspace builds, typechecks, plugin metadata freshness, and the root Vitest suite through Turborepo. `bun run test` runs Vitest once; `bun run test:watch` watches tests. Use these scripts rather than `bun test`, which invokes Bun's separate test runner. Import test APIs from `vitest`. Resolve test-file locations with `import.meta.url`; Vitest does not populate Bun's `import.meta.dir`.

First-party workspaces live under `crates/*`, with `crates/skillset/skillset` registered explicitly as `@glass/skillset`. Each workspace defines its own build, dev, and typecheck scripts as needed; tests are discovered by the root Vitest configuration. TypeScript configs extend the root `tsconfig.json` and declare their own source includes. Emitting builds override `noEmit` and write to `dist/`.

`crates/skillset/skillset/plugin.json` is the canonical plugin metadata. The generator publishes every `SKILL.md` beneath its configured Glass-owned skills directory, sorted by path. Duplicate skill names, invalid paths, and symlinks fail before generated files are written. `skills.csv` is an upstream inventory, not a publication list. After changing metadata or adding, moving, or removing an owned skill, run `bun run generate-plugin` and include the generated root manifests and marketplaces with the source changes. `bun run check-plugin` checks freshness without writing. Run `claude plugin validate . --strict` after changing generated Claude metadata.

`crates/skillset/gstack` and `crates/skillset/mattpocock` are pinned upstream Git submodules, not Bun workspaces. Root formatting, lint, and Vitest discovery exclude only those upstream checkouts, not the sibling first-party package. Keep Glass-owned integration outside the submodules; change their contents or pinned commits only when explicitly requested. Initialize them with `git submodule update --init --recursive`.

Keep prose free of em dashes. Use Bun for scripts rather than multi-line shell scripts.
