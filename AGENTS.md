# Glass

Use Bun 1.4.3 for dependency installation and scripts. `mise.toml` pins the runtime; run `mise install` when setting up a checkout. `bunfig.toml` makes package scripts run JavaScript CLIs with Bun instead of Node. Use `bun install --frozen-lockfile` in CI.

Run `bun run check` before finishing changes; it checks Biome formatting and lint, then runs workspace builds and typechecks plus the root Vitest suite through Turborepo. `bun run test` runs Vitest once; `bun run test:watch` watches tests. Use these scripts rather than `bun test`, which invokes Bun's separate test runner. Import test APIs from `vitest`.

First-party workspaces live under `crates/*`. Each workspace defines its own build, dev, and typecheck scripts as needed; tests are discovered by the root Vitest configuration. TypeScript configs extend the root `tsconfig.json` and declare their own source includes. The shared config uses TypeScript 7 in strict, no-emit mode; emitting builds override `noEmit` and write to `dist/`.

`crates/skillset/gstack` and `crates/skillset/mattpocock` are pinned upstream Git submodules, not Bun workspaces. Root formatting, lint, and Vitest discovery exclude `crates/skillset/`. Keep Glass-owned integration outside those checkouts; change their contents or pinned commits only when explicitly requested. Initialize them with `git submodule update --init --recursive`.

The repository currently has no first-party workspace packages or tests. Turbo therefore has no workspace build or typecheck tasks, and Vitest allows an empty suite while the repository is being bootstrapped. Remove `passWithNoTests` once first-party tests exist.

Keep prose free of em dashes. Use Bun for scripts rather than multi-line shell scripts.
