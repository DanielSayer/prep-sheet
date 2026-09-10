import { setTimeout } from "node:timers/promises";
import { db } from "@prep-sheet/db";
import { processNextImport } from "./imports";

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
try {
  while (!stopping) {
    try {
      if (!(await processNextImport())) await setTimeout(2000);
    } catch {
      // Never log captured text, generated content, credentials or database details.
      console.error(
        JSON.stringify({ event: "import_worker_retry", delayMs: 5000 }),
      );
      await setTimeout(5000);
    }
  }
} finally {
  await db.$client.end();
}
