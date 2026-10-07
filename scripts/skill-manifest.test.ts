import { describe, expect, test } from "bun:test";
import { validateSkillManifest } from "./skill-manifest.js";

const skill = "./skills/engineering/tdd";
const manifest = { name: "glass", version: "0.0.0", skills: [skill] };

describe("validateSkillManifest", () => {
  test("accepts a manifest containing exactly the promoted skills", () => {
    expect(validateSkillManifest(manifest, [skill])).toEqual(manifest);
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
});
