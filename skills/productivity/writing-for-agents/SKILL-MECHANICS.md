# Skill mechanics

The skill-specific branch of [`writing-for-agents`](SKILL.md): frontmatter, invocation, and router skills. Everything else about writing it is the universal reference in `SKILL.md`.

## Invocation

In this repository, every skill is **model-invoked** and explicitly callable by the user. Keep a `description` that states the job and its trigger branches, omit `disable-model-invocation`, and leave implicit invocation enabled in `agents/openai.yaml`.

The description is the skill's top-level context pointer: permanent context load in exchange for discoverability. Keep it narrow enough that a matching task selects the right workflow rather than a larger neighbouring one. Model invocation adds agent reach without removing the human's ability to invoke the skill by name.

Invocation eligibility does not remove a workflow's confirmation points. Keep decisions with the user where the skill calls for them, even when the agent selected the skill automatically.

A model-invoked reference skill can own material several skills need. Other skills call it instead of duplicating its reference or reaching into its folder through relative cross-links.

## Splitting by invocation

The invocation cut of splitting (the sequence cut lives in `SKILL.md`): split off a skill when a distinct leading word should trigger it independently, or another skill must reach it. The new description adds context load, so that independent reach has to earn its cost.

## Router skills

A **router skill** names related skills and when to reach for each, reducing the map a human or agent must remember. Read a target skill before claiming what it does. A request for routing advice earns a recommendation, not automatic execution of the recommended flow. When execution is requested, preserve the target skill's prerequisites and confirmation gates.
