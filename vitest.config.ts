import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      "crates/skillset/gstack/**",
      "crates/skillset/mattpocock/**",
      "**/dist/**",
      "**/coverage/**",
    ],
  },
});
