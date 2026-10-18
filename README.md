<p>
  <a href="https://www.aihero.dev/s/skills-newsletter">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/total-typescript/image/upload/v1777382277/skills-repo-dark_2x.png">
      <source media="(prefers-color-scheme: light)" srcset="https://res.cloudinary.com/total-typescript/image/upload/v1777382277/skill-repo-light_2x.png">
      <img alt="Skills" src="https://res.cloudinary.com/total-typescript/image/upload/v1777382277/skill-repo-light_2x.png" width="369">
    </picture>
  </a>
</p>

# Skills For Real Engineers

[![skills.sh](https://skills.sh/b/intuscare/glass)](https://skills.sh/intuscare/glass)

My agent skills that I use every day to do real engineering - not vibe coding.

Glass ships the reviewed Picks listed in [`skills.csv`](./crates/skillset/skillset/skills.csv), including the Glass-owned [workon](./crates/skillset/skillset/eng/workon/SKILL.md) skill and stubs that forward to upstream suites installed on your machine. The engineering principles below describe the wider source collections; selection determines which workflows are installed.

Developing real applications is hard. Approaches like GSD, BMAD, and Spec-Kit try to help by owning the process. But while doing so, they take away your control and make bugs in the process hard to resolve.

These skills are designed to be small, easy to adapt, and composable. They work with any model. They're based on decades of engineering experience. Hack around with them. Make them your own. Enjoy.

If you want to keep up with changes to these skills, and any new ones I create, you can join ~60,000 other devs on my newsletter:

[Sign Up To The Newsletter](https://www.aihero.dev/s/skills-newsletter)

## Installation (30-second setup)

Two ways in, two philosophies. **The [Claude Code plugin](https://code.claude.com/docs/en/plugins)** installs the whole set as a managed, read-only bundle that updates when Anthropic's marketplace picks up my releases, so you subscribe rather than fork. **[skills.sh](https://skills.sh/intuscare/glass)** copies editable skill files into your project, so you can hack on them and make them your own. Pick one: installing both leaves you with every skill twice.

### 1. Get the skills

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude plugins install glass-skills
```

Or, from inside a session:

```
/plugin install glass-skills
```

It's in Claude Code's official marketplace, so there's nothing to add first. If it says the plugin isn't found, run `claude plugins marketplace update` and retry. Updates reach you when Anthropic's marketplace moves its pin to a new release, which can lag behind this repo by days or weeks.

**Stuck on an old version?** `claude plugin list` shows what you have, and [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json) shows the latest release. To track this repo directly instead, switch to its own marketplace and turn on auto-update for it under `/plugin` → Marketplaces (it's off by default for marketplaces outside Anthropic's):

```bash
claude plugin uninstall glass-skills@claude-plugins-official
claude plugin marketplace add intuscare/glass
claude plugin install glass-skills@glass
```

</details>

<details>
<summary><strong>Codex, and other agents</strong></summary>

```bash
npx skills@latest add intuscare/glass
```

Pick the skills you want, and which coding agents to install them on. For the curated set, use the plugin bundle. Stub Picks only forward to their upstream suite, so they need that suite installed on your machine via [`setup.sh`](./crates/skillset/skillset/setup.sh).

A native Codex plugin is on the roadmap (see [`.agents/adr/0002-ship-as-a-claude-code-plugin.md`](./.agents/adr/0002-ship-as-a-claude-code-plugin.md)).

</details>

<details>
<summary><strong>For tinkerers</strong></summary>

Use the same installer, on any agent, including Claude Code:

```bash
npx skills@latest add intuscare/glass
```

It writes the skills into your repo as ordinary files you own and can edit. Nothing updates behind your back; pull my latest changes when you want them with `npx skills update`.

</details>

### 2. Run a Pick

The current bundle provides `/eng-workon <JIRA-KEY>`. Connect the Atlassian integration first. See [workon](./docs/engineering/workon.md) for behavior and prerequisites.

### 3. Bam - you're ready to go.

## Why These Skills Exist

I built these skills as a way to fix common failure modes I see with Claude Code, Codex, and other coding agents.

### #1: The Agent Didn't Do What I Want

> "No-one knows exactly what they want"
>
> David Thomas & Andrew Hunt, [The Pragmatic Programmer](https://www.amazon.co.uk/Pragmatic-Programmer-Anniversary-Journey-Mastery/dp/B0833F1T3V)

**The Problem**. The most common failure mode in software development is misalignment. You think the dev knows what you want. Then you see what they've built - and you realize it didn't understand you at all.

This is just the same in the AI age. There is a communication gap between you and the agent. The fix for this is a **grilling session** - getting the agent to ask you detailed questions about what you're building.

**The Fix** is to use:

- [`/grill-me`](./crates/skillset/skillset/all/grill-no-write/SKILL.md) - for non-code uses
- [`/grill-with-docs`](./crates/skillset/skillset/all/grill/SKILL.md) - same as [`/grill-me`](./crates/skillset/skillset/all/grill-no-write/SKILL.md), but adds more goodies (see below)

These are my most popular skills. They help you align with the agent before you get started, and think deeply about the change you're making. Use them _every_ time you want to make a change.

### #2: The Agent Is Way Too Verbose

> With a ubiquitous language, conversations among developers and expressions of the code are all derived from the same domain model.
>
> Eric Evans, [Domain-Driven-Design](https://www.amazon.co.uk/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)

**The Problem**: At the start of a project, devs and the people they're building the software for (the domain experts) are usually speaking different languages.

I felt the same tension with my agents. Agents are usually dropped into a project and asked to figure out the jargon as they go. So they use 20 words where 1 will do.

**The Fix** for this is a shared language. It's a document that helps agents decode the jargon used in the project.

<details>
<summary>
Example
</summary>

Here's an example [glossary](https://github.com/glass/course-video-manager/blob/076a5a7a182db0fe1e62971dd7a68bcadf010f1c/CONTEXT.md) (still named `CONTEXT.md` at that pinned commit, from before the skills renamed the convention), from my `course-video-manager` repo. Which one is easier to read?

- **BEFORE**: "There's a problem when a lesson inside a section of a course is made 'real' (i.e. given a spot in the file system)"
- **AFTER**: "There's a problem with the materialization cascade"

This concision pays off session after session.

</details>

This is built into [`/grill-with-docs`](./crates/skillset/skillset/all/grill/SKILL.md). It's a grilling session, but that helps you build a shared language with the AI, and document hard-to-explain decisions in ADR's.

It's hard to explain how powerful this is. It might be the single coolest technique in this repo. Try it, and see.

> [!TIP]
> A shared language has many other benefits than reducing verbosity:
>
> - **Variables, functions and files are named consistently**, using the shared language
> - As a result, the **codebase is easier to navigate** for the agent
> - The agent also **spends fewer tokens on thinking**, because it has access to a more concise language

### #3: The Code Doesn't Work

> "Always take small, deliberate steps. The rate of feedback is your speed limit. Never take on a task that’s too big."
>
> David Thomas & Andrew Hunt, [The Pragmatic Programmer](https://www.amazon.co.uk/Pragmatic-Programmer-Anniversary-Journey-Mastery/dp/B0833F1T3V)

**The Problem**: Let's say that you and the agent are aligned on what to build. What happens when the agent _still_ produces crap?

It's time to look at your feedback loops. Without feedback on how the code it produces actually runs, the agent will be flying blind.

**The Fix**: You need the usual tranche of feedback loops: static types, browser access, and automated tests.

For automated tests, a red-green-refactor loop is critical. This is where the agent writes a failing test first, then fixes the test. This helps give the agent a consistent level of feedback that results in far better code.

I've built a **[`/tdd`](./crates/skillset/skillset/eng/tdd/SKILL.md) skill** you can slot into any project. It encourages red-green-refactor and gives the agent plenty of guidance on what makes good and bad tests.

For debugging, I've also built a **[`/diagnosing-bugs`](./crates/skillset/skillset/eng/debug/SKILL.md)** skill that wraps best debugging practices into a disciplined loop, gated phase by phase.

### #4: We Built A Ball Of Mud

> "Invest in the design of the system _every day_."
>
> Kent Beck, [Extreme Programming Explained](https://www.amazon.co.uk/Extreme-Programming-Explained-Embrace-Change/dp/0321278658)

> "The best modules are deep. They allow a lot of functionality to be accessed through a simple interface."
>
> John Ousterhout, [A Philosophy Of Software Design](https://www.amazon.co.uk/Philosophy-Software-Design-2nd/dp/173210221X)

**The Problem**: Most apps built with agents are complex and hard to change. Because agents can radically speed up coding, they also accelerate software entropy. Codebases get more complex at an unprecedented rate.

**The Fix** for this is a radical new approach to AI-powered development: caring about the design of the code.

This is built in to every layer of these skills:

- [`/to-spec`](./crates/skillset/skillset/eng/to-spec/SKILL.md) quizzes you about which modules you're touching before creating a spec

And crucially, [`/improve-codebase-architecture`](./crates/skillset/skillset/eng/architecture-review/SKILL.md) surveys a codebase for deepening opportunities and hands you the candidates. I recommend running it on your codebase once every few days. It is a survey, not a rescue: on a genuinely old codebase it will find real candidates, but it won't untangle the mud for you.

### Summary

Software engineering fundamentals matter more than ever. These skills are my best effort at condensing these fundamentals into repeatable practices, to help you ship the best apps of your career. Enjoy.

## Reference

### Model-invoked

<!-- picks:start -->

#### all

- **[all-grill](./crates/skillset/skillset/all/grill/SKILL.md)**: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
- **[all-grill-no-write](./crates/skillset/skillset/all/grill-no-write/SKILL.md)**: A relentless interview to sharpen a plan or design.
- **[all-grill-to-questionnaire](./crates/skillset/skillset/all/grill-to-questionnaire/SKILL.md)**: Turn a decision you can't fully answer into a questionnaire for someone else to fill in.
- **[all-teach](./crates/skillset/skillset/all/teach/SKILL.md)**: Teach the user a new skill or concept, within this workspace.
- **[all-wait-what](./crates/skillset/skillset/all/wait-what/SKILL.md)**: Stop; that last message did not land: re-pitch it.

#### doc

- **[doc-diagram](./crates/skillset/skillset/doc/diagram/SKILL.md)**: Turn an English description (or mermaid source) into a diagram triplet: the source, an editable .excalidraw file you can open on excalidraw.com, and rendered SVG + PNG.
- **[doc-pdf](./crates/skillset/skillset/doc/pdf/SKILL.md)**: Turn any markdown file into a publication-quality PDF.
- **[doc-research](./crates/skillset/skillset/doc/research/SKILL.md)**: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo.

#### eng

- **[eng-architecture-design](./crates/skillset/skillset/eng/architecture-design/SKILL.md)**: Shared vocabulary for designing deep modules.
- **[eng-architecture-review](./crates/skillset/skillset/eng/architecture-review/SKILL.md)**: Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
- **[eng-benchmark](./crates/skillset/skillset/eng/benchmark/SKILL.md)**: Web performance regression detection.
- **[eng-debug](./crates/skillset/skillset/eng/debug/SKILL.md)**: Diagnosis loop for hard bugs and performance regressions.
- **[eng-deslop-dry](./crates/skillset/skillset/eng/deslop-dry/SKILL.md)**: Find worthwhile shared-code extractions in recent work.
- **[eng-deslop-test](./crates/skillset/skillset/eng/deslop-test/SKILL.md)**: Find low-value or duplicate tests and the test-only code they keep alive.
- **[eng-dx-review](./crates/skillset/skillset/eng/dx-review/SKILL.md)**: Live developer experience audit.
- **[eng-grill-mega](./crates/skillset/skillset/eng/grill-mega/SKILL.md)**: Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
- **[eng-implement](./crates/skillset/skillset/eng/implement/SKILL.md)**: Implement a piece of work based on a spec or set of tickets.
- **[eng-implement-mega](./crates/skillset/skillset/eng/implement-mega/SKILL.md)**: Implement the result of /to-spec and /to-tickets in code.
- **[eng-model](./crates/skillset/skillset/eng/model/SKILL.md)**: Build and sharpen a project's domain model.
- **[eng-retro](./crates/skillset/skillset/eng/retro/SKILL.md)**: Conduct a retrospective on a coding session.
- **[eng-setup-ts-deep-modules](./crates/skillset/skillset/eng/setup-ts-deep-modules/SKILL.md)**: Wire dependency-cruiser into a TypeScript repo so each package is a deep module, with implementation hidden in subfolders and reachable only through its entry-point files.
- **[eng-tdd](./crates/skillset/skillset/eng/tdd/SKILL.md)**: Test-driven development.
- **[eng-to-spec](./crates/skillset/skillset/eng/to-spec/SKILL.md)**: Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed.
- **[eng-to-tickets](./crates/skillset/skillset/eng/to-tickets/SKILL.md)**: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as text in one file per ticket locally, or native blocking links on a real tracker).
- **[eng-workon](./crates/skillset/skillset/eng/workon/SKILL.md)**: Start work on a Jira ticket by creating or switching to its branch and moving the ticket to In Progress.

#### meta

- **[meta-careful](./crates/skillset/skillset/meta/careful/SKILL.md)**: Safety guardrails for destructive commands.
- **[meta-context-restore](./crates/skillset/skillset/meta/context-restore/SKILL.md)**: Restore working context saved earlier by /context-save.
- **[meta-context-save](./crates/skillset/skillset/meta/context-save/SKILL.md)**: Save working context.
- **[meta-freeze](./crates/skillset/skillset/meta/freeze/SKILL.md)**: Restrict file edits to a specific directory for the session.
- **[meta-guard](./crates/skillset/skillset/meta/guard/SKILL.md)**: Full safety mode: destructive command warnings + directory-scoped edits.
- **[meta-unfreeze](./crates/skillset/skillset/meta/unfreeze/SKILL.md)**: Clear the freeze boundary set by /freeze, allowing edits to all directories again.

#### ui

- **[ui-prototype](./crates/skillset/skillset/ui/prototype/SKILL.md)**: Build a throwaway prototype to answer a design question.
- **[ui-shotgun](./crates/skillset/skillset/ui/shotgun/SKILL.md)**: Design shotgun: generate multiple AI design variants, open a comparison board, collect structured feedback, and iterate.
- **[ui-ui](./crates/skillset/skillset/ui/ui/SKILL.md)**: Use when the user wants to design, redesign, shape, critique, audit, polish, simplify, harden, animate, or otherwise improve a frontend interface: websites, landing pages, dashboards, product UI, components, forms, settings, onboarding, empty states, and native iOS or Android screens.

<!-- picks:end -->

Every Pick supports automatic selection and explicit invocation. Workflow prerequisites and confirmation steps still apply.

### Source collections and curation

Picks live at [`crates/skillset/skillset/<category>/<name>/`](./crates/skillset/skillset/). Glass-owned skills are authored there directly. The upstream suites [mattpocock/skills](https://github.com/mattpocock/skills), [garrytan/gstack](https://github.com/garrytan/gstack), and [pbakaus/impeccable](https://github.com/pbakaus/impeccable) are installed on the machine by [`setup.sh`](./crates/skillset/skillset/setup.sh) and invoked as `/<suite>:<skill>`; nothing of theirs is copied into this repo. A stub Pick is a small `SKILL.md` that forwards to the upstream invocation.

The pick list is the hand-maintained [`skills.csv`](./crates/skillset/skillset/skills.csv): mark a row `picked`, optionally overriding `new_category`, `new_name`, or `new_description`. Run `bun run skillset.pick` to write missing stubs (existing files are never overwritten), then `bun run skillset.index` to regenerate the plugin manifest, discovery links, and the list above, all from `crates/skillset`. Commit the stubs and regenerated metadata together. `bun run check` fails when any of them are stale.
