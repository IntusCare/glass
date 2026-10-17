import { describe, expect, test } from "bun:test";
import { validateSkillManifest } from "./skill-manifest.js";

const root = "./crates/skillset/skillset/skillset/skillset";
const skill = `${root}/eng/tdd`;
const manifest = { name: "glass", version: "0.0.0", skills: [skill] };

describe("validateSkillManifest", () => {
  test("accepts generated Picks from different suites", () => {
    const skills = [skill, `${root}/eng/workon`];
    expect(
      validateSkillManifest({ ...manifest, skills }, skills).skills,
    ).toEqual(skills);
  });

  test("accepts a manifest containing exactly the Picks", () => {
    expect(validateSkillManifest(manifest, [skill])).toEqual({
      ...manifest,
      agents: [],
    });
  });

  test("accepts impeccable skills and generated agents", () => {
    const skills = [skill, `${root}/design/impeccable`];
    const agents = [
      `${root}/infra/impeccable/plugin/agents/impeccable-documenter.md`,
    ];
    expect(
      validateSkillManifest({ ...manifest, skills, agents }, skills, agents)
        .agents,
    ).toEqual(agents);
  });

  test("accepts gstack skills and generated agents", () => {
    const skills = [skill, `${root}/eng/gstack`, `${root}/eng/review`];
    const agents = [`${root}/infra/gstack/review/specialists/security.md`];
    expect(
      validateSkillManifest({ ...manifest, skills, agents }, skills, agents),
    ).toEqual({ ...manifest, skills, agents });
  });

  test("rejects malformed manifests", () => {
    expect(() => validateSkillManifest({ skills: [skill] }, [skill])).toThrow();
  });

  test("rejects duplicate skills", () => {
    expect(() =>
      validateSkillManifest({ ...manifest, skills: [skill, skill] }, [skill]),
    ).toThrow("duplicates");
  });

  test("rejects direct upstream skills", () => {
    expect(() =>
      validateSkillManifest(
        {
          ...manifest,
          skills: ["./crates/skillset/mattpocock/skills/misc/example"],
        },
        [],
      ),
    ).toThrow();
  });

  test("rejects direct upstream agents", () => {
    expect(() =>
      validateSkillManifest(
        {
          ...manifest,
          agents: [
            "./crates/skillset/impeccable/plugin/agents/impeccable-documenter.md",
          ],
        },
        [skill],
      ),
    ).toThrow();
  });

  test("reports Picks missing from the manifest", () => {
    expect(() =>
      validateSkillManifest(manifest, [skill, `${root}/productivity/teach`]),
    ).toThrow(`Missing: ${root}/productivity/teach`);
  });

  test("reports manifest entries that do not exist on disk", () => {
    expect(() => validateSkillManifest(manifest, [])).toThrow(
      `Extra: ${skill}`,
    );
  });

  test("reports generated agents missing from the manifest", () => {
    expect(() =>
      validateSkillManifest(
        manifest,
        [skill],
        [`${root}/infra/gstack/review/specialists/testing.md`],
      ),
    ).toThrow("Missing:");
  });

  test("allows no Picks and rejects exposing infra as a skill", () => {
    expect(
      validateSkillManifest({ ...manifest, skills: [] }, []).skills,
    ).toEqual([]);
    const hidden = `${root}/infra/helper`;
    expect(() =>
      validateSkillManifest({ ...manifest, skills: [hidden] }, [hidden]),
    ).toThrow();
  });
});
