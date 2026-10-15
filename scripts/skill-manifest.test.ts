import { describe, expect, test } from "bun:test";
import { validateSkillManifest } from "./skill-manifest.js";

const skill = "./skills/engineering/tdd";
const manifest = { name: "glass", version: "0.0.0", skills: [skill] };

describe("validateSkillManifest", () => {
  test("accepts a manifest containing exactly the promoted skills", () => {
    expect(validateSkillManifest(manifest, [skill])).toEqual({
      ...manifest,
      agents: [],
    });
  });

  test("accepts vendored impeccable skills and agents", () => {
    const skills = [skill, "./impeccable/plugin/skills/impeccable"];
    const agents = ["./impeccable/plugin/agents/impeccable-documenter.md"];
    expect(
      validateSkillManifest({ ...manifest, skills, agents }, skills, agents)
        .agents,
    ).toEqual(agents);
  });

  test("accepts gstack skills and generated agents", () => {
    const skills = [skill, "./gstack", "./gstack/review"];
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
        { ...manifest, skills: ["./skills/misc/example"] },
        [],
      ),
    ).toThrow();
  });

  test("rejects agents outside the agents directory", () => {
    expect(() =>
      validateSkillManifest(
        { ...manifest, agents: ["./gstack/review/specialists/security.md"] },
        [skill],
      ),
    ).toThrow();
  });

  test("reports promoted skills missing from the manifest", () => {
    expect(() =>
      validateSkillManifest(manifest, [skill, "./skills/productivity/teach"]),
    ).toThrow("Missing: ./skills/productivity/teach");
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
