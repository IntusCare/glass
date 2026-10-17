---
{name: workon,description: "Start work on a Jira ticket by creating or switching to its branch and moving the ticket to In Progress. Use when the user says \"workon\" or \"work on\" with a Jira key or URL, or wants a branch for a Jira ticket.",user-invocable: true,triggers: [model,user]}
---

Start work on one Jira ticket: put the user on the ticket's branch, mark the ticket In Progress, and (when you are Devin) link this session on the ticket.

Jira lives at `intuscare.atlassian.net`. Use it as the `cloudId` for every Atlassian MCP call. If no Atlassian MCP server is connected, stop and tell the user to connect one.

## 1. Resolve the key

Take the key from the user's argument: a bare key (`proj-123`) or a browse URL (`https://intuscare.atlassian.net/browse/PROJ-123`, or any URL carrying the key). Uppercase it. With no argument, ask the user for the key and wait.

## 2. Fetch the ticket

Call `getJiraIssue` for the key, requesting the `summary`, `status`, and `comment` fields. If the fetch fails, stop and report: without the title there is no branch name.

## 3. Build the branch name

The name is `<KEY>-<slug>`. Derive the slug from the ticket's title (`summary`), in this order:

1. Lowercase it.
2. Replace every run of characters outside `[a-z0-9_-]` with a single `-`.
3. Trim `-` from both ends.
4. Cut to the first 24 characters.
5. Trim a trailing `-` again.

`PROJ-123` titled "Fix login redirect on Safari 17 (iOS)" gives `PROJ-123-fix-login-redirect-on-sa`.

## 4. Create or switch

The ticket's branch is any branch named `<KEY>-*`, since titles get edited after the branch exists. Look in this order:

1. Local branches matching `<KEY>-*`: `git switch <branch>`.
2. Remote branches matching `origin/<KEY>-*`: `git switch <branch>` to create a local tracking branch.
3. Neither: `git switch -c <KEY>-<slug>` off the current branch.

If more than one branch matches at a step, ask the user which one. Record whether you created or switched. Never stash: if git refuses to switch, stop and report its error.

## 5. Move to In Progress

Transition only when the ticket's status category is **To Do**; leave anything already in progress, in review, or done where it is. Call `getTransitionsForJiraIssue` and pick, in order of preference:

1. The transition whose target status is named "In Progress" (any case).
2. The transition whose target status is in the In Progress category.

Ask if several transitions tie. If none fits or `transitionJiraIssue` fails, warn and carry on: the branch stands.

## 6. Link the Devin session

Skip this step unless you are Devin.

The session link is your session URL (`https://app.devin.ai/sessions/<id>`) when you know it, otherwise your session ID labelled "Devin CLI session". With neither, skip and tell the user why. Also skip when an existing comment on the ticket already contains this session's URL or ID.

Otherwise call `addCommentToJiraIssue` with one line:

```
Devin is working on this in <session link> on branch <branch>.
```

A failed comment is a warning, not a stop.

## 7. Report

Print any warnings from steps 5 and 6 first, then end with exactly these lines, keeping the blank line between them:

```
Created Branch: <branch>

JIRA Link: https://intuscare.atlassian.net/browse/<KEY>
```

Write `Switched to Branch: <branch>` instead when step 4 switched to an existing branch.
