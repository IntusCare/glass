---
"@glass/skills": minor
---

Ship 34 curated Picks as stubs that forward to upstream suites (mattpocock/skills, gstack, impeccable) installed on your machine by `crates/skillset/skillset/setup.sh`, instead of vendoring or submoduling those suites. Picks are grouped under `all`, `doc`, `eng`, `meta`, and `ui`, several under new names (for example `debug`, `grill`, `ui`). `workon` remains Glass-owned. Install the upstream suites with `setup.sh` before using a stub Pick.
