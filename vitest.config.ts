import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: "apps/web/.env", quiet: true });

export default defineConfig({
  test: {
    // Integration suites share a PostgreSQL import queue.
    fileParallelism: false,
    include: [
      "packages/**/*.test.ts",
      "apps/web/**/*.test.ts",
      "apps/extension/**/*.test.ts",
    ],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
