import { afterEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderReviewer } from "@glass/scripts/agents";
import { fs } from "zx";
import { extractSkills } from "./extract-skills.js";
import { csvPath, indexSkills, serializeCsv } from "./index-skills.js";

const fixtures: string[] = [];
const tooling = "crates/skillset/skillset/skillset";
const output = `${tooling}/skillset`;

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => fs.remove(path)));
});

async function skill(repo: string, path: string, body = "Example\n") {
  await fs.outputFile(
    join(repo, "crates/skillset", path, "SKILL.md"),
    `---\nname: ${path
      .split("/")
      .pop()}\ndescription: Upstream description\ndisable-model-invocation: true\ntriggers: [example]\n---\n${body}`,
  );
}

async function pick(repo: string, paths: string[]) {
  const rows = await indexSkills(repo, []);
  await fs.outputFile(
    join(repo, csvPath),
    serializeCsv(
      rows.map((row) => ({
        ...row,
        status: paths.includes(row.path) ? "picked" : "skipped",
        new_category: "eng",
        new_name: row.name === "start" ? "begin" : "",
        new_description: row.name === "start" ? "Begin the task" : "",
      })),
    ),
  );
}

async function fixture() {
  const repo = await fs.mkdtemp(join(tmpdir(), "glass-extract-"));
  fixtures.push(repo);
  await fs.outputJson(join(repo, ".claude-plugin/plugin.json"), {
    name: "example",
    version: "1.0.0",
    skills: [],
    agents: [],
    description: "Keep this field",
  });
  await skill(repo, "glass/engineering/start", "Ask before publishing.\n");
  await pick(repo, ["glass/engineering/start"]);
  return repo;
}

test("extracts renamed Picks, normalizes invocation, and synchronizes discovery", async () => {
  const repo = await fixture();
  await expect(extractSkills(repo)).rejects.toThrow("extract-skills");
  expect(await fs.pathExists(join(repo, output, "eng"))).toBe(false);
  await extractSkills(repo, true);
  const content = await fs.readFile(
    join(repo, output, "eng/begin/SKILL.md"),
    "utf8",
  );
  expect(content).toContain("name: begin");
  expect(content).toContain("description: Begin the task");
  expect(content).not.toContain("disable-model-invocation");
  expect(content).toContain("Ask before publishing.");
  const codex = Bun.YAML.parse(
    await fs.readFile(
      join(repo, output, "eng/begin/agents/openai.yaml"),
      "utf8",
    ),
  );
  expect(codex).toMatchObject({ policy: { allow_implicit_invocation: true } });
  expect(await fs.readJson(join(repo, ".claude-plugin/plugin.json"))).toEqual({
    name: "example",
    version: "1.0.0",
    description: "Keep this field",
    skills: [`./${output}/eng/begin`],
    agents: [],
  });
  expect(await fs.realpath(join(repo, ".claude/skills/begin/SKILL.md"))).toBe(
    await fs.realpath(join(repo, output, "eng/begin/SKILL.md")),
  );
  await expect(extractSkills(repo)).resolves.toMatchObject({ picks: 1 });
  await extractSkills(repo, true);
});

test("closes recursive dependencies and rewrites renamed calls without exposing support skills", async () => {
  const repo = await fixture();
  await skill(
    repo,
    "glass/engineering/start",
    'Call the Skill tool with "helper".\nRead [guide](guide.md#usage).\n',
  );
  await skill(
    repo,
    "glass/engineering/helper",
    'Call the Skill tool with "start".\nRead [asset](data.json).\n',
  );
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/start/guide.md"),
    "Read [more](../helper/details.md).\n",
  );
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/helper/details.md"),
    "See [guide](../start/guide.md).\n",
  );
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/helper/data.json"),
    '{"ok":true}\n',
  );
  await pick(repo, ["glass/engineering/start"]);
  await extractSkills(repo, true);
  const main = await fs.readFile(
    join(repo, output, "eng/begin/SKILL.md"),
    "utf8",
  );
  expect(main).toContain(
    "../../infra/glass/engineering/helper/instructions.md",
  );
  expect(main).toContain("../../infra/glass/engineering/start/guide.md#usage");
  const helper = await fs.readFile(
    join(repo, output, "infra/glass/engineering/helper/instructions.md"),
    "utf8",
  );
  expect(helper).toContain('Call the Skill tool with "begin"');
  expect(
    await fs.readFile(
      join(repo, output, "infra/glass/engineering/helper/data.json"),
      "utf8",
    ),
  ).toBe('{"ok":true}\n');
  expect(await fs.pathExists(join(repo, ".devin/skills/helper"))).toBe(false);
  await fs.remove(join(repo, "crates/skillset/glass"));
  expect(
    await fs.readFile(join(repo, ".devin/skills/begin/SKILL.md"), "utf8"),
  ).toBe(main);
  expect(
    await fs.pathExists(
      join(repo, output, "infra/glass/engineering/helper/details.md"),
    ),
  ).toBe(true);
});

test("copies scripts, transitive modules and binary assets that run without source suites", async () => {
  const repo = await fixture();
  await skill(
    repo,
    "glass/engineering/start",
    "Run `scripts/run.ts`. Read [image](image.png).\n",
  );
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/start/scripts/run.ts"),
    '#!/usr/bin/env bun\nimport { value } from "./constants.ts";\nconsole.log(value);\n',
  );
  await fs.chmod(
    join(repo, "crates/skillset/glass/engineering/start/scripts/run.ts"),
    0o755,
  );
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/start/scripts/constants.ts"),
    'export const value = "portable";\n',
  );
  const image = Buffer.from([137, 80, 78, 71, 255, 0, 10]);
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/start/image.png"),
    image,
  );
  await pick(repo, ["glass/engineering/start"]);
  await extractSkills(repo, true);
  await fs.remove(join(repo, "crates/skillset/glass"));
  const script = join(
    repo,
    output,
    "infra/glass/engineering/start/scripts/run.ts",
  );
  const result = Bun.spawnSync([process.execPath, script], { cwd: tmpdir() });
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe("portable");
  expect((await fs.stat(script)).mode & 0o777).toBe(0o755);
  expect(
    await fs.readFile(
      join(repo, output, "infra/glass/engineering/start/image.png"),
    ),
  ).toEqual(image);
});

test("explicit rules include dynamic dependencies and only required agent profiles", async () => {
  const repo = await fixture();
  await skill(
    repo,
    "glass/engineering/start",
    "Run `$TOOLS/check`. Delegate the checklist.\n",
  );
  await fs.outputFile(
    join(repo, "crates/skillset/gstack/bin/check"),
    "#!/bin/sh\nexit 0\n",
  );
  await fs.outputFile(
    join(repo, "crates/skillset/gstack/review/specialists/security.md"),
    "# Security\nCheck authorization.\n",
  );
  await fs.outputFile(
    join(repo, "crates/skillset/impeccable/plugin/agents/helper.md"),
    "---\nname: helper\ndescription: Help\ntools: Read, Bash\nmodel: opus\n---\nRead [guide](guide.md).\n",
  );
  await fs.outputFile(
    join(repo, "crates/skillset/impeccable/plugin/agents/guide.md"),
    "Help carefully.\n",
  );
  await fs.outputFile(
    join(repo, "crates/skillset/impeccable/plugin/agents/unused.md"),
    "Not required.\n",
  );
  await fs.outputJson(join(repo, tooling, "extraction-rules.json"), {
    files: {
      "glass/engineering/start/SKILL.md": {
        references: { "$TOOLS/check": "gstack/bin/check" },
        agents: [
          {
            path: "gstack/review/specialists/security.md",
            kind: "gstack-reviewer",
          },
          { path: "impeccable/plugin/agents/helper.md", kind: "profile" },
        ],
      },
    },
  });
  await pick(repo, ["glass/engineering/start"]);
  await extractSkills(repo, true);
  const manifest = await fs.readJson(join(repo, ".claude-plugin/plugin.json"));
  expect(manifest.agents).toEqual([
    `./${output}/infra/gstack/review/specialists/security.md`,
    `./${output}/infra/impeccable/plugin/agents/helper.md`,
  ]);
  const helper = await fs.readFile(
    join(repo, output, "infra/impeccable/plugin/agents/helper.md"),
    "utf8",
  );
  expect(helper).not.toContain("model:");
  expect(helper).toContain("  - Read");
  expect(
    await fs.pathExists(
      join(repo, output, "infra/impeccable/plugin/agents/unused.md"),
    ),
  ).toBe(false);
});

test("cleanup removes renamed and skipped Picks and unused support but preserves unrelated files", async () => {
  const repo = await fixture();
  await skill(repo, "glass/engineering/start", "Read [guide](guide.md).\n");
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/start/guide.md"),
    "Guide\n",
  );
  await pick(repo, ["glass/engineering/start"]);
  await extractSkills(repo, true);
  await fs.outputFile(join(repo, output, "keep.txt"), "human");
  const rows = await indexSkills(repo, []);
  await fs.outputFile(
    join(repo, csvPath),
    serializeCsv(
      rows.map((row) => ({ ...row, status: "picked", new_name: "renamed" })),
    ),
  );
  await extractSkills(repo, true);
  expect(await fs.pathExists(join(repo, output, "eng/begin/SKILL.md"))).toBe(
    false,
  );
  expect(await fs.pathExists(join(repo, ".devin/skills/begin"))).toBe(false);
  await pick(repo, []);
  await extractSkills(repo, true);
  expect(
    (await fs.readJson(join(repo, ".claude-plugin/plugin.json"))).skills,
  ).toEqual([]);
  expect(
    await fs.pathExists(join(repo, output, "engineering/renamed/SKILL.md")),
  ).toBe(false);
  expect(
    await fs.pathExists(
      join(repo, output, "infra/glass/engineering/start/guide.md"),
    ),
  ).toBe(false);
  expect(await fs.readFile(join(repo, output, "keep.txt"), "utf8")).toBe(
    "human",
  );
  await expect(extractSkills(repo)).resolves.toMatchObject({
    picks: 0,
    changed: 0,
  });
});

test("validation errors and manual edits leave all previous output intact", async () => {
  const repo = await fixture();
  await extractSkills(repo, true);
  const manifest = await fs.readFile(
    join(repo, ".claude-plugin/plugin.json"),
    "utf8",
  );
  const original = await fs.readFile(
    join(repo, output, "eng/begin/SKILL.md"),
    "utf8",
  );
  await skill(repo, "glass/engineering/start", "Read [missing](missing.md).\n");
  await pick(repo, ["glass/engineering/start"]);
  await expect(extractSkills(repo, true)).rejects.toThrow("Missing dependency");
  expect(
    await fs.readFile(join(repo, output, "eng/begin/SKILL.md"), "utf8"),
  ).toBe(original);
  expect(
    await fs.readFile(join(repo, ".claude-plugin/plugin.json"), "utf8"),
  ).toBe(manifest);
  await skill(repo, "glass/engineering/start");
  await pick(repo, ["glass/engineering/start"]);
  await fs.appendFile(
    join(repo, output, "eng/begin/SKILL.md"),
    "Manual edit\n",
  );
  await expect(extractSkills(repo, true)).rejects.toThrow("Manually edited");
  expect(
    await fs.readFile(join(repo, ".claude-plugin/plugin.json"), "utf8"),
  ).toBe(manifest);
});

test("migrates old discovery links without following unrelated links", async () => {
  const repo = await fixture();
  await fs.ensureDir(join(repo, ".devin/skills"));
  await fs.symlink(
    "../../crates/skillset/glass/engineering/start",
    join(repo, ".devin/skills/start"),
  );
  await fs.symlink("../../elsewhere", join(repo, ".devin/skills/custom"));
  await extractSkills(repo, true);
  expect(
    await fs.lstat(join(repo, ".devin/skills/start"), {
      throwIfNoEntry: false,
    }),
  ).toBeUndefined();
  expect(await fs.readlink(join(repo, ".devin/skills/custom"))).toBe(
    "../../elsewhere",
  );
  expect(await fs.pathExists(join(repo, ".devin/skills/begin"))).toBe(true);
});

test("rejects collisions, stale input, unknown calls, and unsafe destinations before writing", async () => {
  const repo = await fixture();
  await skill(repo, "glass/engineering/other");
  await expect(extractSkills(repo, true)).rejects.toThrow("index-skills");
  const rows = await indexSkills(repo, []);
  await fs.outputFile(
    join(repo, csvPath),
    serializeCsv(
      rows.map((row) => ({
        ...row,
        status: "picked",
        new_name: "duplicate",
      })),
    ),
  );
  await expect(extractSkills(repo, true)).rejects.toThrow("Duplicate Pick");
  await skill(
    repo,
    "glass/engineering/start",
    'Call the Skill tool with "absent".\n',
  );
  await pick(repo, ["glass/engineering/start"]);
  await expect(extractSkills(repo, true)).rejects.toThrow(
    'Unknown skill "absent"',
  );
  await skill(repo, "glass/engineering/start");
  await pick(repo, ["glass/engineering/start"]);
  await fs.ensureDir(join(repo, "outside"));
  await fs.ensureDir(join(repo, output));
  await fs.symlink(join(repo, "outside"), join(repo, output, "eng"));
  await expect(extractSkills(repo, true)).rejects.toThrow(
    "non-directory parent",
  );
  expect(await fs.readdir(join(repo, "outside"))).toEqual([]);
  expect(await fs.pathExists(join(repo, ".devin"))).toBe(false);
});

test("relocates gstack helpers and preserves shell-relative dependencies", async () => {
  const repo = await fixture();
  await skill(
    repo,
    "glass/engineering/start",
    "Run `~/.claude/skills/gstack/bin/check`.\n",
  );
  await fs.outputFile(
    join(repo, "crates/skillset/gstack/bin/check"),
    '#!/bin/sh\n. "$(dirname "$0")/values.sh"\nprintf "%s\\n" "$VALUE"\n',
  );
  await fs.outputFile(
    join(repo, "crates/skillset/gstack/bin/values.sh"),
    "VALUE=portable\n",
  );
  await pick(repo, ["glass/engineering/start"]);
  await extractSkills(repo, true);
  await fs.remove(join(repo, "crates/skillset/gstack"));
  const script = join(repo, output, "infra/gstack/bin/check");
  const result = Bun.spawnSync(["sh", script], { cwd: tmpdir() });
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe("portable");
  const main = await fs.readFile(
    join(repo, output, "eng/begin/SKILL.md"),
    "utf8",
  );
  expect(main).not.toContain("~/.claude/skills/gstack");
  expect(main).toContain("../../infra/gstack/bin/check");
});

test("script runtime rewrites explicitly anchor helpers instead of relying on the caller's cwd", async () => {
  const repo = await fixture();
  await skill(repo, "glass/engineering/start", "Run `run.sh`.\n");
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/start/run.sh"),
    '#!/bin/sh\nsh "$TOOLS/helper.sh"\n',
  );
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/start/helper.sh"),
    '#!/bin/sh\nprintf "portable\\n"\n',
  );
  await pick(repo, ["glass/engineering/start"]);
  await expect(extractSkills(repo, true)).rejects.toThrow("extraction rule");
  await fs.outputJson(join(repo, tooling, "extraction-rules.json"), {
    files: {
      "glass/engineering/start/run.sh": {
        rewrites: { '"$TOOLS/helper.sh"': '"$(dirname "$0")/helper.sh"' },
        dependencies: ["glass/engineering/start/helper.sh"],
      },
    },
  });
  await extractSkills(repo, true);
  await fs.remove(join(repo, "crates/skillset/glass"));
  const result = Bun.spawnSync(
    ["sh", join(repo, output, "infra/glass/engineering/start/run.sh")],
    { cwd: tmpdir() },
  );
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().trim()).toBe("portable");
});

test("preserves Codex metadata while relocating icons and renaming its default prompt", async () => {
  const repo = await fixture();
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/start/agents/openai.yaml"),
    'interface:\n  display_name: Start\n  icon_small: ./assets/icon.svg\n  default_prompt: "Use $start to begin."\npolicy:\n  allow_implicit_invocation: false\n',
  );
  await fs.outputFile(
    join(repo, "crates/skillset/glass/engineering/start/assets/icon.svg"),
    "<svg></svg>\n",
  );
  await extractSkills(repo, true);
  const metadata = Bun.YAML.parse(
    await fs.readFile(
      join(repo, output, "eng/begin/agents/openai.yaml"),
      "utf8",
    ),
  );
  expect(metadata).toMatchObject({
    interface: {
      default_prompt: "Use $begin to begin.",
      icon_small: "../../infra/glass/engineering/start/assets/icon.svg",
    },
    policy: { allow_implicit_invocation: true },
  });
  expect(
    await fs.pathExists(
      join(repo, output, "infra/glass/engineering/start/assets/icon.svg"),
    ),
  ).toBe(true);
});

test("Markdown examples do not turn API routes or illustrative imports into package dependencies", async () => {
  const repo = await fixture();
  const example =
    "```typescript\nimport { user } from './example';\n" +
    `fetch(\`/users/\${userId}/orders\`);\n` +
    "```\n";
  await skill(repo, "glass/engineering/start", example);
  await pick(repo, ["glass/engineering/start"]);
  await extractSkills(repo, true);
  const content = await fs.readFile(
    join(repo, output, "eng/begin/SKILL.md"),
    "utf8",
  );
  expect(content).toContain(example);
});

test("bracketed placeholder paths in prose are neither copied nor rewritten", async () => {
  const repo = await fixture();
  const line =
    "Disk paths stay `~/.claude/skills/gstack/[skill-name]/SKILL.md`.";
  await skill(repo, "glass/engineering/start", `${line}\n`);
  await pick(repo, ["glass/engineering/start"]);
  await extractSkills(repo, true);
  const content = await fs.readFile(
    join(repo, output, "eng/begin/SKILL.md"),
    "utf8",
  );
  expect(content).toContain(line);
  const generated = await fs.glob(`${output}/**/*`, { cwd: repo });
  expect(
    generated.filter((path: string) => path.includes("[skill-name]")),
  ).toEqual([]);
});

test("legacy agent migration refuses edited profiles before removing any generated content", async () => {
  const repo = await fixture();
  const checklist = "# Security\nCheck authorization.\n";
  await fs.outputFile(
    join(repo, "crates/skillset/gstack/review/specialists/security.md"),
    checklist,
  );
  await fs.ensureDir(join(repo, "crates/skillset/impeccable/plugin/agents"));
  const old = renderReviewer("security", checklist);
  await fs.outputFile(
    join(repo, "agents/security.md"),
    `${old}\nManual edit\n`,
  );
  const manifestPath = join(repo, ".claude-plugin/plugin.json");
  const manifest = await fs.readJson(manifestPath);
  manifest.agents = ["./agents/security.md"];
  await fs.outputJson(manifestPath, manifest);
  await expect(extractSkills(repo, true)).rejects.toThrow(
    "Manually edited generated file",
  );
  expect(await fs.pathExists(join(repo, output, "eng/begin"))).toBe(false);
  expect((await fs.readJson(manifestPath)).agents).toEqual([
    "./agents/security.md",
  ]);
  await fs.writeFile(join(repo, "agents/security.md"), old);
  await extractSkills(repo, true);
  expect(await fs.pathExists(join(repo, "agents/security.md"))).toBe(false);
  expect((await fs.readJson(manifestPath)).agents).toEqual([]);
});
