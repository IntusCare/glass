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

**Stuck on an old version?** `claude plugin list` shows what you have, and [CHANGELOG.md](./crates/skillset/glass/CHANGELOG.md) shows the latest release. To track this repo directly instead, switch to its own marketplace and turn on auto-update for it under `/plugin` → Marketplaces (it's off by default for marketplaces outside Anthropic's):

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

Pick the skills you want, and which coding agents to install them on. **The installer lets you choose which skills to take, so make sure `setup-matt-pocock-skills` is one of them.**

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

### 2. Run `/setup-matt-pocock-skills`

In your agent, run it once per repo. It will:

- Ask you which issue tracker you want to use (GitHub, GitLab, local files, or anything else you describe)
- Ask you what labels you apply to tickets when you triage them (`/triage` uses labels)
- Ask you where you want to save any docs we create

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

- [`/grill-me`](./crates/skillset/mattpocock/skills/productivity/grill-me/SKILL.md) - for non-code uses
- [`/grill-with-docs`](./crates/skillset/mattpocock/skills/engineering/grill-with-docs/SKILL.md) - same as [`/grill-me`](./crates/skillset/mattpocock/skills/productivity/grill-me/SKILL.md), but adds more goodies (see below)

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

This is built into [`/grill-with-docs`](./crates/skillset/mattpocock/skills/engineering/grill-with-docs/SKILL.md). It's a grilling session, but that helps you build a shared language with the AI, and document hard-to-explain decisions in ADR's.

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

I've built a **[`/tdd`](./crates/skillset/mattpocock/skills/engineering/tdd/SKILL.md) skill** you can slot into any project. It encourages red-green-refactor and gives the agent plenty of guidance on what makes good and bad tests.

For debugging, I've also built a **[`/diagnosing-bugs`](./crates/skillset/mattpocock/skills/engineering/diagnosing-bugs/SKILL.md)** skill that wraps best debugging practices into a disciplined loop, gated phase by phase.

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

- [`/to-spec`](./crates/skillset/mattpocock/skills/engineering/to-spec/SKILL.md) quizzes you about which modules you're touching before creating a spec

And crucially, [`/improve-codebase-architecture`](./crates/skillset/mattpocock/skills/engineering/improve-codebase-architecture/SKILL.md) surveys a codebase for deepening opportunities and hands you the candidates. I recommend running it on your codebase once every few days. It is a survey, not a rescue: on a genuinely old codebase it will find real candidates, but it won't untangle the mud for you.

### Summary

Software engineering fundamentals matter more than ever. These skills are my best effort at condensing these fundamentals into repeatable practices, to help you ship the best apps of your career. Enjoy.

## Reference

The Matt Pocock suite comes from [mattpocock/skills](https://github.com/mattpocock/skills) as a submodule at `crates/skillset/mattpocock`, tracking `main`. Its invocation policies are upstream's: user-invoked skills require an explicit request, while model-invoked skills can also be selected automatically. Glass's own `workon` skill and release metadata live in `crates/skillset/glass`.

After cloning, run `git submodule update --init`. Devin, Claude Code, and Codex discover Glass and Matt Pocock skills through relative symlinks. To upgrade Matt Pocock's suite, run `git submodule update --remote crates/skillset/mattpocock`, then `bun run link-skills`, re-sync the plugin manifest, and commit the new gitlink and links. The gitlink pins a commit; `branch = main` selects the branch for remote updates. Edit Glass skills under `crates/skillset/glass`; keep submodules unmodified. Git must preserve symlinks. Restart the agent if discovery does not refresh.

### Engineering

Skills I use daily for code work.

**User-invoked**

- **[ask-matt](./crates/skillset/mattpocock/skills/engineering/ask-matt/SKILL.md)**: Ask which skill or flow fits your situation. A router over the upstream skills.
- **[grill-with-docs](./crates/skillset/mattpocock/skills/engineering/grill-with-docs/SKILL.md)**: Interview about a design while recording terminology and decisions.
- **[triage](./crates/skillset/mattpocock/skills/engineering/triage/SKILL.md)**: Move issues through triage roles.
- **[improve-codebase-architecture](./crates/skillset/mattpocock/skills/engineering/improve-codebase-architecture/SKILL.md)**: Survey deepening opportunities, then explore a chosen candidate.
- **[setup-matt-pocock-skills](./crates/skillset/mattpocock/skills/engineering/setup-matt-pocock-skills/SKILL.md)**: Configure issue tracking, triage labels, and domain docs.
- **[to-spec](./crates/skillset/mattpocock/skills/engineering/to-spec/SKILL.md)**: Turn a conversation into a spec.
- **[to-tickets](./crates/skillset/mattpocock/skills/engineering/to-tickets/SKILL.md)**: Split a plan into tracer-bullet tickets with blocking edges.
- **[implement](./crates/skillset/mattpocock/skills/engineering/implement/SKILL.md)**: Build a spec or tickets with TDD and code review.
- **[implement-spec](./crates/skillset/mattpocock/skills/engineering/implement-spec/SKILL.md)**: Implement a whole ticket graph on one integration branch.
- **[wayfinder](./crates/skillset/mattpocock/skills/engineering/wayfinder/SKILL.md)**: Map a large uncertain effort as decision tickets.
- **[retro](./crates/skillset/mattpocock/skills/engineering/retro/SKILL.md)**: Propose improvements to the coding agent's environment after a session.

**Model-invoked**

- **[prototype](./crates/skillset/mattpocock/skills/engineering/prototype/SKILL.md)**: Build a throwaway program to answer a design question.
- **[diagnosing-bugs](./crates/skillset/mattpocock/skills/engineering/diagnosing-bugs/SKILL.md)**: Diagnose hard bugs through a reproducible feedback loop.
- **[research](./crates/skillset/mattpocock/skills/engineering/research/SKILL.md)**: Investigate primary sources and capture cited findings.
- **[tdd](./crates/skillset/mattpocock/skills/engineering/tdd/SKILL.md)**: Build features and fixes one tested vertical slice at a time.
- **[domain-modeling](./crates/skillset/mattpocock/skills/engineering/domain-modeling/SKILL.md)**: Sharpen domain language and record it in glossary entries and ADRs.
- **[codebase-design](./crates/skillset/mattpocock/skills/engineering/codebase-design/SKILL.md)**: Design deep modules with small interfaces and testable seams.
- **[code-review](./crates/skillset/mattpocock/skills/engineering/code-review/SKILL.md)**: Review a diff against repository standards and its originating spec.
- **[pr](./crates/skillset/mattpocock/skills/engineering/pr/SKILL.md)**: Write a PR body with a clear summary, validation, and merge risks.
- **[wizard](./crates/skillset/mattpocock/skills/engineering/wizard/SKILL.md)**: Generate an interactive wizard for steps only a human can perform.
- **[workon](./crates/skillset/glass/engineering/workon/SKILL.md)**: Start a Jira ticket: switch to its branch, move it to In Progress, and link the Devin session.

### Productivity

General workflow tools, not code-specific.

**User-invoked**

- **[grill-me](./crates/skillset/mattpocock/skills/productivity/grill-me/SKILL.md)**: Sharpen a plan through a stateless interview.
- **[handoff](./crates/skillset/mattpocock/skills/productivity/handoff/SKILL.md)**: Write a portable handoff document for another session.
- **[teach](./crates/skillset/mattpocock/skills/productivity/teach/SKILL.md)**: Learn a topic across sessions in a teaching workspace.
- **[to-questionnaire](./crates/skillset/mattpocock/skills/productivity/to-questionnaire/SKILL.md)**: Draft questions for someone who holds information you need.
- **[wait-what](./crates/skillset/mattpocock/skills/productivity/wait-what/SKILL.md)**: Re-pitch an explanation with simpler language and missing context.

**Model-invoked**

- **[grilling](./crates/skillset/mattpocock/skills/productivity/grilling/SKILL.md)**: The reusable interview discipline behind the planning workflows.
- **[writing-for-agents](./crates/skillset/mattpocock/skills/productivity/writing-for-agents/SKILL.md)**: Write and sharpen documents that agents consume.

### gstack

[garrytan/gstack](https://github.com/garrytan/gstack) ships alongside these skills as a git submodule at [`crates/skillset/gstack/`](./crates/skillset/gstack/), tracking upstream `main`. The plugin lists its router (`/gstack`) and all of its skills (`/review`, `/qa`, `/ship`, `/investigate`, `/office-hours`, and the rest; see [crates/skillset/gstack/README.md](./crates/skillset/gstack/README.md)), plus eight review subagents generated from gstack's review specialists under [`agents/`](./agents/): `api-contract-reviewer`, `data-migration-reviewer`, `maintainability-reviewer`, `performance-reviewer`, `red-team-reviewer`, `security-reviewer`, `simplification-reviewer`, and `testing-reviewer`.

### impeccable

[pbakaus/impeccable](https://github.com/pbakaus/impeccable) (design fluency for frontend work: `/impeccable polish`, `audit`, `critique`, and 20 more sub-commands) is a git submodule at [`crates/skillset/impeccable/`](./crates/skillset/impeccable/), tracking upstream `main`. The plugin lists its [`impeccable`](./crates/skillset/impeccable/plugin/skills/impeccable/SKILL.md) skill straight from that tree and its four subagents (`impeccable-asset-producer`, `impeccable-documenter`, `impeccable-finish-reviewer`, `impeccable-manual-edit-applier`) as generated copies under [`agents/`](./agents/). After cloning, run `git submodule update --init` to populate all three upstream suites.
