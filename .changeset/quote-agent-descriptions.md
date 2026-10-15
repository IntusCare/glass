---
"glass-skills": patch
---

Quote the generated gstack agent descriptions so their frontmatter is valid YAML (seven of them contained ": ", which Devin rejected as a malformed agent), and parse every agent profile's frontmatter with a real YAML parser in `bun run check`.
