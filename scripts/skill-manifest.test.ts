import { describe, expect, test } from "bun:test";
import { validateSkillManifest } from "./skill-manifest.js";

const skill = "./crates/skillset/skillset/skillset/eng/tdd";
const manifest = { name: "glass", version: "0.0.0", skills: [skill] };

describe("validateSkillManifest", () => {
  test("accepts generated Picks from different suites", () => {
    const skills = [skill, "./crates/skillset/skillset/skillset/eng/workon"];
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
    const skills = [
      skill,
      "./crates/skillset/skillset/skillset/design/impeccable",
    ];
    const agents = [
      "./crates/skillset/skillset/skillset/infra/impeccable/plugin/agents/impeccable-documenter.md",
    ];
    expect(
      validateSkillManifest({ ...manifest, skills, agents }, skills, agents)
        .agents,
    ).toEqual(agents);
  });

  test("accepts gstack skills and generated agents", () => {
    const skills = [
      skill,
      "./crates/skillset/skillset/skillset/eng/gstack",
      "./crates/skillset/skillset/skillset/eng/review",
    ];
    const agents = [
      "./crates/skillset/skillset/skillset/infra/gstack/review/specialists/security.md",
    ];
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
      validateSkillManifest(manifest, [
        skill,
        "./crates/skillset/skillset/skillset/productivity/teach",
      ]),
    ).toThrow(
      "Missing: ./crates/skillset/skillset/skillset/productivity/teach",
    );
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
        [
          "./crates/skillset/skillset/skillset/infra/gstack/review/specialists/testing.md",
        ],
      ),
    ).toThrow("Missing:");
  });

  test("allows no Picks and rejects exposing infra as a skill", () => {
    expect(
      validateSkillManifest({ ...manifest, skills: [] }, []).skills,
    ).toEqual([]);
    const hidden = "./crates/skillset/skillset/skillset/infra/helper";
    expect(() =>
      validateSkillManifest({ ...manifest, skills: [hidden] }, [hidden]),
    ).toThrow();
  });
});
