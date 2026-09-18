import { db } from "@prep-sheet/db";
import { user } from "@prep-sheet/db/schema/auth";
import {
  accountDeletionRequest,
  supportRequest,
} from "@prep-sheet/db/schema/support";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { completeAccountDeletion } from "./account-deletion";

const [command, reference, confirmation] = process.argv.slice(2);
try {
  if (command === "list") {
    const reports = await db
      .select({ request: supportRequest, email: user.email })
      .from(supportRequest)
      .innerJoin(user, eq(user.id, supportRequest.userId))
      .orderBy(desc(supportRequest.createdAt));
    const deletions = await db
      .select({ request: accountDeletionRequest, email: user.email })
      .from(accountDeletionRequest)
      .innerJoin(user, eq(user.id, accountDeletionRequest.userId));
    process.stdout.write(
      `${JSON.stringify({ reports, deletions }, null, 2)}\n`,
    );
  } else if (command === "complete-deletion" && confirmation === "--confirm") {
    await completeAccountDeletion(z.uuid().parse(reference));
    process.stdout.write("Account deletion completed.\n");
  } else {
    throw new Error(
      "Usage: support-admin.ts list | complete-deletion <request-id> --confirm",
    );
  }
} finally {
  await db.$client.end();
}
