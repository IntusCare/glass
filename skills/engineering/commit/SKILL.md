---
name: commit
description: Create atomic Conventional Commits from the working tree, staging hunk by hunk with patches.
argument-hint: "[push=true]"
disable-model-invocation: true
---

# Commit

Arguments:

- `push`: push after committing (default: `false`).

## Workflow

1. Read the state and recent history (`git status --short`, `git diff HEAD`, `git log --oneline -10`) and match the granularity, scopes, and explanation style already in the log.
2. Split the diff into independently revertable units, hunk by hunk rather than file by file.
3. Stage each unit with `git apply --cached -v <patch>`. `git add -p` and `git add --interactive` wait for a terminal an agent does not have, so a patch is the only way to stage part of a file. Read [references/git-apply.md](references/git-apply.md) when one fails to apply.
4. Commit, then confirm with `git show HEAD`.

## Revertability

Every commit answers "if I revert this alone, does anything else break?". Tiny commits are expected: one review comment, one wording correction, one reference-file extraction.

Tiny is not partial. A move, rename, or extraction lands as a single commit holding both sides: old path removed, new path added, references updated, generated output synced.

Keep separate concerns in separate commits even when each change is correct, so reverting one concern does not revert unrelated work.

When the repo squash-merges PR branches, review fixes stack as follow-up commits. Amend only unpublished local mistakes, or when the user asks.

## Messages

Conventional Commits: `<type>(<scope>): <subject>`. The subject names the artifact or behavior changed and reads sensibly alone in a commit list; reviewer context goes in the body. Prefer `docs(skills): clarify reference routing` with a body citing the review feedback over `chore: address review feedback`. The body wraps at 72 columns and covers problem, rationale, decisions, and impact.

The scope comes from the repo, not from you. When a `commit-msg` hook, a commitlint config, or the agent docs list the allowed scopes, read that source and use it; otherwise take the scope from the log, matching how existing commits name the area the staged paths live in.

Formatter-only changes are `chore: format`, or `chore(<scope>): format` when the scope rule above applies. Messages are US English.

## Push (push=true)

Changes reach the default branch through a PR, so commit on a feature branch; read [references/push.md](references/push.md) for the branch and upstream checks.

Push once every commit is in place and let the repo's git hooks run. Their failures are part of normal validation, so fix them in a new small commit.
