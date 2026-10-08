# Staging with `git apply --cached`

Read this when a patch fails to apply.

## Building a patch

1. Dump the file's diff with full headers: `git diff HEAD -- <path> > /tmp/<name>.patch`.
2. Delete whole hunks (a `@@` header through the line before the next `@@`) that belong to another commit. Keep the `diff --git`, `---`, and `+++` lines.
3. Stage it: `git apply --cached -v /tmp/<name>.patch`.
4. Check what landed with `git diff --cached --stat`, then `git diff --cached -- <path>` for anything surprising.

Whole files need no patch: `git add <path>` for a new or fully-included file, `git rm --cached <path>` to unstage one.

## Splitting one hunk

When one hunk holds two concerns, edit the hunk itself: turn the lines that belong to the other commit back into context lines (drop the leading `+`, or delete the line if it was a `-`), then pass `--recount` so git recomputes the hunk header line counts.

## Common failures

| Error | Cause | Fix |
| --- | --- | --- |
| `patch does not apply` with `corrupt patch` | Hunk header counts no longer match after hand edits | Add `--recount` |
| `patch does not apply` with `while searching for` | Context lines differ from the index (another hunk from this file already staged, or the file was edited since the diff) | Regenerate the patch from `git diff HEAD -- <path>` and remove the hunks already staged |
| `patch failed` on whitespace | CRLF or trailing-space mismatch | Add `--whitespace=nowarn`, or `--ignore-whitespace` as a last resort |
| `already exists in index` | Patch creates a file that is already staged | `git rm --cached <path>` and retry, or just `git add <path>` |
| Nothing staged, no error | Patch had no hunks left | Check the file with `cat -A` for stray characters, or rebuild it |

`git apply --cached --check <patch>` reports whether it would apply, without touching the index.
