import { afterEach, beforeEach, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fs } from "zx";
import { findPicks, firstSentence, indexMetadata } from "./index-metadata.js";

let repo: string;

const readme = (inner: string) => `# Fixture

### Model-invoked

<!-- picks:start -->
${inner}<!-- picks:end -->

Trailing content stays.
`;

async function writePick(
  category: string,
  name: string,
  description: string,
  frontmatterName?: string,
) {
  const dir = join(repo, "crates/skillset/skillset", category, name);
  await fs.ensureDir(dir);
  await fs.writeFile(
    join(dir, "SKILL.md"),
    `---\nname: ${
      frontmatterName ?? `${category}-${name}`
    }\ndescription: ${description}\n---\n\nBody.\n`,
  );
}

beforeEach(async () => {
  repo = await fs.mkdtemp(join(tmpdir(), "index-metadata-"));
  await fs.ensureDir(join(repo, ".claude-plugin"));
  await fs.writeJson(join(repo, ".claude-plugin/plugin.json"), {
    name: "fixture",
    skills: ["./old"],
    agents: [],
  });
  await fs.writeFile(join(repo, "README.md"), readme("stale\n\n"));
});

afterEach(async () => {
  await fs.remove(repo);
});

test("writes plugin.json skills sorted and preserves other keys", async () => {
  await writePick("eng", "beta", "Second. More.");
  await writePick("all", "alpha", "First.");
  const stale = await indexMetadata(repo, { check: false });
  expect(stale).toContain(".claude-plugin/plugin.json");
  const json = await fs.readJson(join(repo, ".claude-plugin/plugin.json"));
  expect(json).toEqual({
    name: "fixture",
    skills: [
      "./crates/skillset/skillset/all/alpha",
      "./crates/skillset/skillset/eng/beta",
    ],
    agents: [],
  });
});

test("creates, repoints and prunes .devin/skills symlinks", async () => {
  await writePick("eng", "beta", "B.");
  const linksDir = join(repo, ".devin/skills");
  await fs.ensureDir(linksDir);
  await fs.symlink("../wrong", join(linksDir, "eng-beta"));
  await fs.symlink("../old", join(linksDir, "beta"));
  await fs.symlink("../stale", join(linksDir, "gone"));
  await indexMetadata(repo, { check: false });
  expect(await fs.readlink(join(linksDir, "eng-beta"))).toBe(
    "../../crates/skillset/skillset/eng/beta",
  );
  // The old basename-style link is pruned.
  expect(await fs.pathExists(join(linksDir, "beta"))).toBe(false);
  expect(await fs.pathExists(join(linksDir, "gone"))).toBe(false);
});

test("throws on a regular file inside .devin/skills", async () => {
  await writePick("eng", "beta", "B.");
  const linksDir = join(repo, ".devin/skills");
  await fs.ensureDir(linksDir);
  await fs.writeFile(join(linksDir, "beta"), "not a symlink");
  await expect(indexMetadata(repo, { check: false })).rejects.toThrow(
    "not a symlink",
  );
});

test("rewrites the README block grouped by category", async () => {
  await writePick("eng", "beta", "Second sentence test. Drop this.");
  await writePick("all", "alpha", "First.");
  await indexMetadata(repo, { check: false });
  const next = await fs.readFile(join(repo, "README.md"), "utf8");
  expect(next).toContain(
    `<!-- picks:start -->\n\n#### all\n\n- **[all-alpha](./crates/skillset/skillset/all/alpha/SKILL.md)**: First.\n\n#### eng\n\n- **[eng-beta](./crates/skillset/skillset/eng/beta/SKILL.md)**: Second sentence test.\n\n<!-- picks:end -->`,
  );
  expect(next).toContain("Trailing content stays.");
  expect(next).toContain("# Fixture");
});

test("throws when README markers are missing", async () => {
  await writePick("eng", "beta", "B.");
  await fs.writeFile(join(repo, "README.md"), "# No markers\n");
  await expect(indexMetadata(repo, { check: false })).rejects.toThrow(
    "markers",
  );
});

test("colliding category-folder names throw naming both dirs", async () => {
  await writePick("a-b", "c", "A.");
  await writePick("a", "b-c", "B.");
  await expect(findPicks(repo)).rejects.toThrow(
    /duplicate pick name "a-b-c" in crates\/skillset\/skillset\/(a-b\/c|a\/b-c) and crates\/skillset\/skillset\/(a-b\/c|a\/b-c)/,
  );
});

test("frontmatter name not matching category-folder throws", async () => {
  await writePick("eng", "beta", "B.", "eng-wrong");
  await expect(findPicks(repo)).rejects.toThrow(
    'frontmatter name "eng-wrong" in crates/skillset/skillset/eng/beta does not match "eng-beta"',
  );
});

test("check returns stale outputs without writing, then clean after write", async () => {
  await writePick("eng", "beta", "B.");
  const stale = await indexMetadata(repo, { check: true });
  expect(stale).toContain(".claude-plugin/plugin.json");
  expect(stale).toContain("README.md");
  expect(stale).toContain(".devin/skills/eng-beta");
  expect(
    (await fs.readJson(join(repo, ".claude-plugin/plugin.json"))).skills,
  ).toEqual(["./old"]);
  expect(await indexMetadata(repo, { check: false })).not.toEqual([]);
  expect(await indexMetadata(repo, { check: true })).toEqual([]);
});

test("firstSentence", () => {
  expect(firstSentence("A. B.")).toBe("A.");
  expect(firstSentence("no period")).toBe("no period");
  // "e.g. foo. Bar." cuts at the first ". " even mid-abbreviation.
  expect(firstSentence("e.g. foo. Bar.")).toBe("e.g.");
  expect(firstSentence("Ends here.")).toBe("Ends here.");
});
