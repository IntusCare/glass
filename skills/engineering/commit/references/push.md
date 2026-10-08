# Push checks

Read this before pushing.

1. **Branch.** `git branch --show-current` names a feature branch, never the default branch (`main`, `master`, `develop`, or whatever `git symbolic-ref refs/remotes/origin/HEAD` points at). If you are on the default branch, `git checkout -b <branch>` moves you and your unpushed commits onto a feature branch; tell the user the local default branch still carries them.
2. **Upstream.** `git rev-parse --abbrev-ref @{upstream}` succeeds, or the push sets it: `git push -u origin HEAD`.
3. **Remote state.** `git fetch` first. If the upstream has commits you lack, follow the repo's convention (rebase or merge) and rerun the hooks; never `--force` a shared branch. `--force-with-lease` is acceptable only on your own unshared branch after an amend the user asked for.
4. **Hooks.** Pre-push hooks run the repo's own checks. A failure is a finding, not an obstacle: fix it in a new small commit and push again. Reach for `--no-verify` only when the user asks.
