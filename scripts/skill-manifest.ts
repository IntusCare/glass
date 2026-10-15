import { z } from "zod";

const skillPath =
  /^\.\/(skills\/(engineering|productivity)\/[a-z0-9-]+|gstack(\/[a-z0-9-]+)?|impeccable\/plugin\/skills\/[a-z0-9-]+)$/;
const agentPath = /^\.\/(agents|impeccable\/plugin\/agents)\/[a-z0-9-]+\.md$/;

function unique(items: string[]) {
  return new Set(items).size === items.length;
}

export const skillManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  skills: z
    .array(z.string().regex(skillPath))
    .min(1)
    .refine(unique, { message: "Skills must not contain duplicates" }),
  agents: z
    .array(z.string().regex(agentPath))
    .refine(unique, { message: "Agents must not contain duplicates" })
    .default([]),
});

function diff(kind: string, actual: string[], expected: string[]) {
  const missing = expected.filter((item) => !actual.includes(item));
  const extra = actual.filter((item) => !expected.includes(item));
  if (missing.length || extra.length) {
    throw new Error(
      `Plugin ${kind} do not match the repository. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`,
    );
  }
}

export function validateSkillManifest(
  input: unknown,
  promotedSkills: string[],
  agents: string[] = [],
) {
  const manifest = skillManifestSchema.parse(input);
  diff("skills", manifest.skills, promotedSkills);
  diff("agents", manifest.agents, agents);
  return manifest;
}
