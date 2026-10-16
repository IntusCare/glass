---
"glass-skills": patch
---

Strip the `triggers` key from every vendored gstack `SKILL.md`. Devin reads `triggers` as the skill's invocation policy, so gstack's trigger phrases made all 58 skills invisible in Devin while impeccable and the engineering skills loaded fine. `bun run vendored-skills` applies the trim and `bun run check` fails while any vendored skill still declares it.
