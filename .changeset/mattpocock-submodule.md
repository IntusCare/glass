---
"glass-skills": patch
---

Replace the copied Matt Pocock skills with the `mattpocock/skills` submodule at `crates/skillset/mattpocock`, tracking upstream `main`. Retain Glass's `workon` skill, release package, and changelog in `crates/skillset/glass`. Refresh plugin paths and local discovery links; upstream invocation policies now apply, including user-only skills. Run `git submodule update --init` after cloning.
