## What it does

`commit` turns a dirty working tree into a series of atomic [Conventional Commits](https://www.conventionalcommits.org/). It reads the recent log to match the granularity and scopes already in use, splits the diff into units that each revert cleanly on their own, stages each unit, and writes a subject that reads sensibly in a commit list with the reviewer context in the body. With `push=true` it pushes the branch once every commit is in place.

It stages by patch, hunk by hunk, rather than file by file. Interactive staging (`git add -p`) waits for a terminal an [agent](https://www.aihero.dev/ai-coding-dictionary/agent) does not have, so the skill builds a patch for each unit and applies it to the index with `git apply --cached`. That is what lets one file's changes land in two commits when they belong to two concerns.

## When to reach for it

You invoke this by typing `/commit`, and the agent won't reach for it on its own.

| Your situation | Reach for |
| --- | --- |
| A working tree with changes that are yours to land | `/commit` |
| The same, and you want the branch pushed too | `/commit push=true` |
| You are mid-build on a ticket | [implement](https://aihero.dev/skills-implement), which commits for itself when it finishes |
| The commits are in and the PR needs a body | [pr](https://aihero.dev/skills-pr) |

## Revertable, not partial

The unit of work is the **revertable** commit: revert it alone and nothing else breaks. That cuts both ways. Separate concerns stay in separate commits even when every change is correct, so tiny commits (one review comment, one wording fix) are normal. But a move, rename, or extraction is one commit holding both sides, because half of it reverts to a broken tree.

The scope in `type(scope): subject` comes from the repo. If a `commit-msg` hook or commitlint config lists the allowed scopes, the agent reads it; otherwise it copies how the log already names the area.

## Common questions

**Why patches instead of `git add -p`?**

Interactive staging prompts for keystrokes, and an agent running it in a non-interactive shell hangs. A patch piped through `git apply --cached` does the same job without a prompt. The skill carries a reference file for the cases where a hand-edited patch refuses to apply (stale hunk counts, context that no longer matches the index, whitespace).

**Will it amend or force-push?**

Not by default. It amends only unpublished local mistakes or when you ask, and it treats review fixes as follow-up commits on the assumption that PR branches are squash-merged. Pushing fetches first and never forces a shared branch.

**What if a hook fails on commit or push?**

The failure is treated as a finding: fix it in a new small commit and try again. Skipping hooks with `--no-verify` only happens when you ask for it.

## It's working if

- `git log --oneline` on the branch reads as a list of changes, not a list of files.
- You can revert any one commit and the tree still builds.
- A file that carried two concerns shows up in two commits.
- Subjects name what changed; "address review feedback" never appears.

## Where it fits

`commit` is a chain step at the end of a build: `implement → code-review → commit → pr`. [implement](https://aihero.dev/skills-implement) commits for itself, so `commit` is for the tree you shaped by hand or outside that chain; [pr](https://aihero.dev/skills-pr) writes the body once the commits are pushed.

[ask-matt](https://aihero.dev/skills-ask-matt) routes across the whole set when you are unsure which skill the situation wants.
