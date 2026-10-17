/**
 * Extract skills into skillset.
 * 1. Select all picked skills in in skills.csv and upsert the source file at <path> into skillset/<new_category/<new_name>/SKILL.md.
 * 2. Rewrite the description to match the description in skills.csv.
 * 3. Delete any previously picked skills that are no longer in skills.csv.
 * 4. Scan the picked skills for broken references and fix them, recursively copying any missing skills into the infra:<new_category>/<name>.md.
 * 5. Make all skills model executable.
 */
