---
"glass-skills": minor
---

New skill: `commit`. Splits the working tree into atomic Conventional Commits, staging hunk by hunk with `git apply --cached` patches so each commit reverts alone, with `push=true` to push the branch afterwards. Ships with reference notes on building and repairing patches and on pre-push checks.
