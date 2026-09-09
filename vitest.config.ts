import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: "apps/web/.env", quiet: true });

export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/web/**/*.test.ts",
      "apps/extension/**/*.test.ts",
    ],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
