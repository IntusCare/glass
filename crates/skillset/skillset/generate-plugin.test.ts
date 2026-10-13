import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";
import { generatePluginMetadata } from "./generate-plugin";

const fixtures: string[] = [];
const configPath = "crates/skillset/skillset/plugin.json";
const skillsPath = "crates/skillset/skillset/skills";
const outputs = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".devin-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".agents/plugins/marketplace.json",
];

function write(repo: string, path: string, content: string) {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), content);
}

function readJson(repo: string, path: string) {
  return JSON.parse(readFileSync(join(repo, path), "utf8"));
}

function fixture() {
  const repo = mkdtempSync(join(tmpdir(), "glass-plugin-"));
  fixtures.push(repo);
  write(
    repo,
    configPath,
    JSON.stringify({
      name: "fixture-plugin",
      displayName: "Fixture Plugin",
      version: "2.3.4",
      description: "Fixture workflows",
      author: { name: "Fixture Team" },
      homepage: "https://example.com/plugin",
      repository: "https://example.com/repo",
      keywords: ["engineering"],
      category: "engineering",
      skillsDirectory: `./${skillsPath}`,
    }),
  );
  mkdirSync(join(repo, skillsPath), { recursive: true });
  return repo;
}

function addSkill(repo: string, path: string, name: string) {
  write(
    repo,
    `${skillsPath}/${path}/SKILL.md`,
    `---\nname: ${name}\ndescription: Example workflow\n---\n\nExample workflow.\n`,
  );
}

afterEach(() => {
  for (const repo of fixtures.splice(0)) rmSync(repo, { recursive: true });
});

test("check mode reports missing metadata without creating directories", () => {
  const repo = fixture();
  expect(() => generatePluginMetadata(repo, true)).toThrow(
    "bun run generate-plugin",
  );
  for (const directory of [
    ".claude-plugin",
    ".devin-plugin",
    ".codex-plugin",
    ".agents",
  ]) {
    expect(existsSync(join(repo, directory))).toBe(false);
  }
});

test("generation and check mode leave current output bytes and timestamps untouched", () => {
  const repo = fixture();
  generatePluginMetadata(repo);
  for (const path of outputs) utimesSync(join(repo, path), 1_000, 1_000);
  const before = outputs.map((path) => ({
    contents: readFileSync(join(repo, path), "utf8"),
    mtime: statSync(join(repo, path)).mtimeMs,
  }));
  expect(generatePluginMetadata(repo, true)).toEqual({ skills: 0, files: 5 });
  generatePluginMetadata(repo);
  expect(
    outputs.map((path) => ({
      contents: readFileSync(join(repo, path), "utf8"),
      mtime: statSync(join(repo, path)).mtimeMs,
    })),
  ).toEqual(before);
  for (const path of outputs.filter((path) => path.endsWith("/plugin.json"))) {
    expect(readJson(repo, path).skills).toEqual([]);
  }
});

test("check mode detects configuration and output drift without rewriting files", () => {
  const repo = fixture();
  generatePluginMetadata(repo);
  write(
    repo,
    configPath,
    JSON.stringify({ ...readJson(repo, configPath), version: "2.3.5" }),
  );
  write(repo, ".devin-plugin/plugin.json", "{}\n");
  const before = outputs.map((path) => readFileSync(join(repo, path), "utf8"));
  expect(() => generatePluginMetadata(repo, true)).toThrow("metadata is stale");
  expect(outputs.map((path) => readFileSync(join(repo, path), "utf8"))).toEqual(
    before,
  );
  generatePluginMetadata(repo);
  expect(readJson(repo, ".devin-plugin/plugin.json").version).toBe("2.3.5");
  expect(() => generatePluginMetadata(repo, true)).not.toThrow();
});

test("adding or removing an owned skill makes generated metadata stale", () => {
  const repo = fixture();
  generatePluginMetadata(repo);
  addSkill(repo, "eng/review", "review");
  expect(() => generatePluginMetadata(repo, true)).toThrow("metadata is stale");
  generatePluginMetadata(repo);
  expect(readJson(repo, ".claude-plugin/plugin.json").skills).toEqual([
    "./crates/skillset/skillset/skills/eng/review",
  ]);
  rmSync(join(repo, skillsPath, "eng/review"), { recursive: true });
  expect(() => generatePluginMetadata(repo, true)).toThrow("metadata is stale");
  generatePluginMetadata(repo);
  expect(readJson(repo, ".claude-plugin/plugin.json").skills).toEqual([]);
});

test("duplicate skill names fail before changing any output", () => {
  const repo = fixture();
  addSkill(repo, "eng/review", "review");
  addSkill(repo, "prod/review", "review");
  for (const path of outputs) write(repo, path, "preserve existing metadata\n");

  expect(() => generatePluginMetadata(repo)).toThrow(
    "Duplicate skill name: review",
  );
  for (const path of outputs) {
    expect(readFileSync(join(repo, path), "utf8")).toBe(
      "preserve existing metadata\n",
    );
  }
});

test.each([
  "../skills",
  `./${skillsPath}/../skills`,
  "./crates/skillset/mattpocock/skills",
  `./${skillsPath}/missing`,
  `./${skillsPath}\\eng`,
])(
  "rejects invalid skills path %s before creating output directories",
  (skillsDirectory) => {
    const repo = fixture();
    write(
      repo,
      configPath,
      JSON.stringify({ ...readJson(repo, configPath), skillsDirectory }),
    );
    expect(() => generatePluginMetadata(repo)).toThrow("Invalid skills path");
    expect(existsSync(join(repo, ".claude-plugin"))).toBe(false);
  },
);

test("rejects absolute skills paths even within the repository", () => {
  const repo = fixture();
  write(
    repo,
    configPath,
    JSON.stringify({
      ...readJson(repo, configPath),
      skillsDirectory: join(repo, skillsPath),
    }),
  );
  expect(() => generatePluginMetadata(repo)).toThrow("Invalid skills path");
  expect(existsSync(join(repo, ".claude-plugin"))).toBe(false);
});

test("rejects symlinked source directories instead of silently omitting skills", () => {
  const repo = fixture();
  mkdirSync(join(repo, "elsewhere"));
  symlinkSync(join(repo, "elsewhere"), join(repo, skillsPath, "linked"), "dir");
  expect(() => generatePluginMetadata(repo)).toThrow("Invalid skills path");
  expect(existsSync(join(repo, ".claude-plugin"))).toBe(false);
});

test("rejects a symlinked SKILL.md", () => {
  const repo = fixture();
  write(
    repo,
    "elsewhere/SKILL.md",
    "---\nname: review\ndescription: Review\n---\n",
  );
  mkdirSync(join(repo, skillsPath, "review"));
  symlinkSync(
    join(repo, "elsewhere/SKILL.md"),
    join(repo, skillsPath, "review/SKILL.md"),
  );
  expect(() => generatePluginMetadata(repo)).toThrow("Invalid skills path");
  expect(existsSync(join(repo, ".claude-plugin"))).toBe(false);
});

test.each(["symlink", "parent file", "destination directory"])(
  "preflights all output paths before writing when the last destination is a %s",
  (kind) => {
    const repo = fixture();
    const earlier = outputs.slice(0, -1);
    for (const path of earlier)
      write(repo, path, "preserve existing metadata\n");
    if (kind === "symlink") {
      write(repo, "elsewhere/marketplace.json", "preserve external file\n");
      mkdirSync(join(repo, ".agents"));
      symlinkSync(
        join(repo, "elsewhere"),
        join(repo, ".agents/plugins"),
        "dir",
      );
    } else if (kind === "parent file") {
      write(repo, ".agents", "preserve parent file\n");
    } else {
      mkdirSync(join(repo, ".agents/plugins/marketplace.json"), {
        recursive: true,
      });
    }
    expect(() => generatePluginMetadata(repo)).toThrow("Invalid output path");
    for (const path of earlier) {
      expect(readFileSync(join(repo, path), "utf8")).toBe(
        "preserve existing metadata\n",
      );
    }
    if (kind === "symlink") {
      expect(
        readFileSync(join(repo, "elsewhere/marketplace.json"), "utf8"),
      ).toBe("preserve external file\n");
    }
  },
);

test.each(["duplicate names", "invalid path"])(
  "the CLI exits nonzero without writing metadata for %s",
  async (failure) => {
    const repo = fixture();
    if (failure === "duplicate names") {
      addSkill(repo, "eng/review", "review");
      addSkill(repo, "prod/review", "review");
    } else {
      write(
        repo,
        configPath,
        JSON.stringify({
          ...readJson(repo, configPath),
          skillsDirectory: "../outside",
        }),
      );
    }
    const build = await Bun.build({
      entrypoints: [
        fileURLToPath(new URL("./generate-plugin.ts", import.meta.url)),
      ],
      outdir: join(repo, "crates/skillset/skillset"),
      target: "bun",
    });
    expect(build.success).toBe(true);
    const result = Bun.spawnSync(
      [
        process.execPath,
        join(repo, "crates/skillset/skillset/generate-plugin.js"),
      ],
      { cwd: repo },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain(
      failure === "duplicate names"
        ? "Duplicate skill name: review"
        : "Invalid skills path",
    );
    expect(existsSync(join(repo, ".claude-plugin"))).toBe(false);
  },
);

test("generates native manifests and marketplaces from the canonical metadata and owned skills", () => {
  const repo = fixture();
  addSkill(repo, "prod/alpha", "alpha");
  addSkill(repo, "eng/zebra", "zebra");
  write(
    repo,
    "crates/skillset/mattpocock/skills/upstream/SKILL.md",
    "---\nname: upstream\ndescription: Not published\n---\n",
  );

  expect(generatePluginMetadata(repo)).toEqual({ skills: 2, files: 5 });
  for (const path of outputs.filter((path) => path.endsWith("/plugin.json"))) {
    const manifest = readJson(repo, path);
    expect(manifest).toMatchObject({
      name: "fixture-plugin",
      version: "2.3.4",
      description: "Fixture workflows",
      author: { name: "Fixture Team" },
      repository: "https://example.com/repo",
      homepage: "https://example.com/plugin",
      keywords: ["engineering"],
      skills: [
        "./crates/skillset/skillset/skills/eng/zebra",
        "./crates/skillset/skillset/skills/prod/alpha",
      ],
    });
    expect(manifest).not.toHaveProperty("skillsDirectory");
    expect(manifest).not.toHaveProperty("license");
  }
  expect(readJson(repo, ".claude-plugin/plugin.json").displayName).toBe(
    "Fixture Plugin",
  );
  expect(readJson(repo, ".codex-plugin/plugin.json").interface).toMatchObject({
    displayName: "Fixture Plugin",
    developerName: "Fixture Team",
    shortDescription: "Fixture workflows",
  });
  expect(readJson(repo, ".claude-plugin/marketplace.json")).toMatchObject({
    name: "fixture-plugin",
    owner: { name: "Fixture Team" },
    plugins: [
      { name: "fixture-plugin", source: "./", category: "engineering" },
    ],
  });
  expect(readJson(repo, ".agents/plugins/marketplace.json")).toEqual({
    name: "fixture-plugin",
    interface: { displayName: "Fixture Plugin" },
    plugins: [
      {
        name: "fixture-plugin",
        source: { source: "local", path: "./" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "engineering",
      },
    ],
  });
});
