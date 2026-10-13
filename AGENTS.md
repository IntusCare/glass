# Glass

Use Bun for dependency installation and scripts. Run `bun run check` before finishing changes; it checks Biome formatting and lint, then runs workspace builds, typechecks, and tests through Turborepo. Use `bun install --frozen-lockfile` in CI.

First-party workspaces live under `apps/*`, `packages/*`, or `crates/*`. Each workspace defines its own build, dev, typecheck, and test scripts as needed. TypeScript configs extend the root `tsconfig.json` and declare their own source includes. The shared config uses TypeScript 7 in strict, no-emit mode; emitting builds override `noEmit` and write to `dist/`.

`crates/skillset/gstack` and `crates/skillset/mattpocock` are pinned upstream Git submodules, not Bun workspaces. Root formatting, lint, and typechecking exclude `crates/skillset/`. Keep Glass-owned integration outside those checkouts; change their contents or pinned commits only when explicitly requested. Initialize them with `git submodule update --init --recursive`.

The repository currently has no first-party workspace packages. Until one is added, Turbo has no build, typecheck, or test tasks to execute; a successful root check validates only the root Biome configuration and files.

Keep prose free of em dashes. Use Bun for scripts rather than multi-line shell scripts.
