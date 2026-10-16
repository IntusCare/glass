import { describe, expect, test } from "bun:test";
import { validateSkillManifest } from "./skill-manifest.js";

const skill = "./crates/skillset/engineering/tdd";
const manifest = { name: "glass", version: "0.0.0", skills: [skill] };

describe("validateSkillManifest", () => {
  test("accepts a manifest containing exactly the promoted skills", () => {
    expect(validateSkillManifest(manifest, [skill])).toEqual({
      ...manifest,
      agents: [],
    });
  });

  test("accepts impeccable skills and generated agents", () => {
    const skills = [skill, "./crates/impeccable/plugin/skills/impeccable"];
    const agents = ["./agents/impeccable-documenter.md"];
    expect(
      validateSkillManifest({ ...manifest, skills, agents }, skills, agents)
        .agents,
    ).toEqual(agents);
  });

  test("accepts gstack skills and generated agents", () => {
    const skills = [skill, "./crates/gstack", "./crates/gstack/review"];
    const agents = ["./agents/security.md"];
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

  test("rejects skills outside the promoted buckets", () => {
    expect(() =>
      validateSkillManifest(
        { ...manifest, skills: ["./crates/skillset/misc/example"] },
        [],
      ),
    ).toThrow();
  });

  test("rejects agents outside the agents directory", () => {
    expect(() =>
      validateSkillManifest(
        {
          ...manifest,
          agents: [
            "./crates/impeccable/plugin/agents/impeccable-documenter.md",
          ],
        },
        [skill],
      ),
    ).toThrow();
  });

  test("reports promoted skills missing from the manifest", () => {
    expect(() =>
      validateSkillManifest(manifest, [
        skill,
        "./crates/skillset/productivity/teach",
      ]),
    ).toThrow("Missing: ./crates/skillset/productivity/teach");
  });

  test("reports manifest entries that do not exist on disk", () => {
    expect(() => validateSkillManifest(manifest, [])).toThrow(
      `Extra: ${skill}`,
    );
  });

  test("reports generated agents missing from the manifest", () => {
    expect(() =>
      validateSkillManifest(manifest, [skill], ["./agents/testing.md"]),
    ).toThrow("Missing: ./agents/testing.md");
  });
});
