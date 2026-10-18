## What it does

`workon` takes a Jira ticket key and gets you ready to work on it. It puts you on the ticket's branch, moves the ticket to In Progress, and, when the [agent](https://www.aihero.dev/ai-coding-dictionary/agent) is Devin, comments a link to the session on the ticket. It finishes by printing the branch and the ticket's Jira link.

The ticket key is the branch's identity, not its full name. The branch is `<KEY>-<slug>`, with the slug cut from the ticket's title, but any branch starting with `<KEY>-` counts as the ticket's branch. Renaming the ticket later never forks a second branch: running `workon` again switches you back to the one you already have.

## When to reach for it

Type `/eng-workon PROJ-123` (or paste the ticket's URL), or the agent reaches for it automatically when you ask to start work on a Jira ticket. With no key, it asks for one.

`workon` is a Glass-owned Pick, authored directly at `crates/skillset/skillset/eng/eng-workon/SKILL.md`. Other workflows linked below are stub Picks that forward to their upstream suite; they need that suite installed on your machine.

| Your situation | Reach for |
| --- | --- |
| A Jira ticket is ready and you want to start on it | `workon` |
| You are on the ticket's branch and want it built | [implement](https://aihero.dev/skills-implement) or [tdd](https://aihero.dev/skills-tdd) |
| The work isn't ticketed yet | [to-tickets](https://aihero.dev/skills-to-tickets), which does not write to Jira |

## Prerequisites

An Atlassian MCP server connected to `intuscare.atlassian.net`. The skill reads and updates the ticket through it and stops if none is connected.

## The branch

| What's there already | What happens |
| --- | --- |
| A local branch named `<KEY>-*` | Switches to it |
| Only `origin/<KEY>-*` | Checks it out as a local tracking branch |
| Several matches | Asks you which one |
| Nothing | Creates `<KEY>-<slug>` off your current branch |

The slug is the title lowercased, with everything outside `a-z`, `0-9`, `_`, and `-` collapsed to single dashes, cut to 24 characters. Uncommitted changes come along with the switch; nothing is stashed. If git refuses the switch, the skill stops and shows you why.

## Common questions

**Will it drag a ticket back from review or done?**

No. It moves the ticket only while it is still in a To Do status. Running it on a ticket that is in progress, in review, or done changes the branch and nothing on the ticket.

**Why didn't it comment on the ticket?**

Only Devin comments, and only once per session per ticket. It also skips when it knows neither its session URL nor its session ID, and says so.

## It's working if

- Running it twice on the same ticket leaves you on one branch, not two.
- The ticket shows In Progress, and, from Devin, one comment pointing at the session.
- The output ends with `Created Branch:` (or `Switched to Branch:`) and a `JIRA Link:` to the ticket.

## Where it fits

A reach-for-it-anytime standalone at the start of ticketed work. Once you are on the branch, [implement](https://aihero.dev/skills-implement) builds it, and [pr](https://aihero.dev/skills-pr) shapes the body when it goes up for review. For the whole map, see [ask-matt](https://aihero.dev/skills-ask-matt).
