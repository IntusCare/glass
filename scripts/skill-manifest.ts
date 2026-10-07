import { z } from "zod";

export const skillManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  skills: z
    .array(
      z.string().regex(/^\.\/skills\/(engineering|productivity)\/[a-z0-9-]+$/),
    )
    .min(1)
    .refine((skills) => new Set(skills).size === skills.length, {
      message: "Skills must not contain duplicates",
    }),
});

export function validateSkillManifest(
  input: unknown,
  promotedSkills: string[],
) {
  const manifest = skillManifestSchema.parse(input);
  const missing = promotedSkills.filter(
    (skill) => !manifest.skills.includes(skill),
  );
  const extra = manifest.skills.filter(
    (skill) => !promotedSkills.includes(skill),
  );

  if (missing.length || extra.length) {
    throw new Error(
      `Plugin skills do not match promoted skills. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`,
    );
  }

  return manifest;
}
