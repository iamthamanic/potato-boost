import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "tests/golden/**/*.test.ts",
      "tests/security/**/*.test.ts",
    ],
  },
});
