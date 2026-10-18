# The canonical install block

One install story, one wording. `README.md`, `.changeset/*`, and every page under `docs/` must say **this** and nothing else. Change it here first, then propagate.

`glass` installs from this repo's own marketplace, `.claude-plugin/marketplace.json` (marketplace name `glass`). It is not listed in Claude Code's official marketplace, so never tell users there is nothing to add first. Auto-update is off by default for marketplaces outside Anthropic's ([discover-plugins](https://code.claude.com/docs/en/discover-plugins)); never promise that updates arrive automatically.

## Claude Code: the plugin

<canonical-block name="claude-code">

```bash
claude plugin marketplace add intuscare/glass
claude plugin install glass@glass
```

Or, from inside a session:

```
/plugin marketplace add intuscare/glass
/plugin install glass@glass
```

Updates are off by default for marketplaces outside Anthropic's. Turn on auto-update for `glass` under `/plugin` → Marketplaces, or pull a release by hand with `claude plugin marketplace update glass`. `claude plugin list` shows what you have, and [CHANGELOG.md](../crates/skillset/CHANGELOG.md) shows the latest release.

</canonical-block>

## Codex, and other agents: skills.sh

The plugin is Claude Code only. Everywhere else, [skills.sh](https://skills.sh/intuscare/glass) copies editable skill files into the project. Use the whole-set form on `README.md`:

<canonical-block name="skills-sh-whole-set">

```bash
npx skills@latest add intuscare/glass
```

Pick the skills you want, and which coding agents to install them on. **The installer lets you choose which skills to take: make sure `setup-matt-pocock-skills` is one of them.**

</canonical-block>

…and the single-skill form wherever one skill is named on its own. Note that **`docs/` pages are not a consumer of this block**: ai-hero renders the install widget above the body, so a page that writes the commands out duplicates it. See [writing-docs.md](./writing-docs.md).

<canonical-block name="skills-sh-one-skill">

```bash
npx skills@latest add intuscare/glass --skill=<name>
```

```bash
npx skills@latest update <name>
```

</canonical-block>

`skills@latest` is the pinned spelling in all three. The pages under `docs/` used to carry their own copy of these commands; those blocks are now deleted rather than corrected, because the site renders the install commands itself.

## The two routes are exclusive

The plugin is a managed, read-only bundle you subscribe to. skills.sh writes files you own and edit. Installing both leaves the user with every skill twice: always say "pick one".

## The marketplace manifest

`.claude-plugin/marketplace.json` makes the repo its own single-plugin marketplace and is the documented install route. Its `plugins[].name` must match `.claude-plugin/plugin.json`'s `name`; run `claude plugin validate . --strict` after touching either.
