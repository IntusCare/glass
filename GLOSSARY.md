# Glass Skills

A plugin that ships a curated set of agent skills (slash commands and behaviors) drawn from several upstream skill collections plus Glass's own, loaded by Claude Code and Devin.

## Language

### Skill inventory

**Suite**:
One collection of skills Glass picks from. Glass's own lives in this repo; upstream suites (mattpocock, gstack, impeccable) are installed alongside the plugin rather than vendored.
_Avoid_: crate, library, vendored copy

**Skill**:
A directory holding a `SKILL.md` that an agent can load. Identified within the plugin by its path relative to `crates/skillset/`.

**Category**:
The folder that groups a **Skill** inside its **Suite** (`engineering`, `productivity`, `in-progress`); a flat **Suite** has the suite's own name as its only category.
_Avoid_: bucket

**Pick**:
A **Skill** shipped as a discoverable entry point in the plugin: either Glass-owned, or a stub that forwards to a **Skill** in a **Suite**, optionally under a new **Category**, name, or description.

**Skillset**:
The set of all **Picks**.

### Issue tracking

**Issue tracker**:
The tool that hosts a repo's issues: GitHub Issues, Linear, a local `.scratch/` markdown convention, or similar. Skills like `to-tickets`, `to-spec`, and `triage` read from and write to it.
_Avoid_: backlog manager, backlog backend, issue host

**Issue**:
A single tracked unit of work inside an **Issue tracker**: a bug, task, spec, or slice produced by `to-tickets`.
_Avoid_: ticket (use only when quoting external systems that call them tickets, or for a **Decision ticket**, see below)

**Decision ticket**:
A `wayfinder` unit: a child **Issue** of a `wayfinder:map` holding a *question* whose resolution is a decision, not a slice of a build to execute. The **decision** qualifier is what keeps it distinct from an implementation ticket; `wayfinder` introduces the term, then uses "ticket".

**Triage role**:
A canonical state-machine label applied to an **Issue** during triage (e.g. `needs-triage`, `ready-for-afk`). Each role maps to a real label string in the **Issue tracker** via `docs/agents/triage-labels.md`.

## Relationships

- A **Suite** holds many **Skills**, each in one **Category**
- The **Skillset** contains **Picks**; a stub **Pick** forwards to exactly one **Skill** in some **Suite**
- An **Issue tracker** holds many **Issues**
- An **Issue** carries one **Triage role** at a time
- A **Decision ticket** is an **Issue** (a child of a `wayfinder:map`)

## Flagged ambiguities

- "backlog" was previously used to mean both the *tool* hosting issues and the *body of work* inside it. Resolved: the tool is the **Issue tracker**; "backlog" is no longer used as a domain term.
- "backlog backend" / "backlog manager". Resolved: collapsed into **Issue tracker**.
