import { db } from "@prep-sheet/db";
import { user } from "@prep-sheet/db/schema/auth";
import { group } from "@prep-sheet/db/schema/group";
import { recipe } from "@prep-sheet/db/schema/recipe";
import { accountDeletionRequest } from "@prep-sheet/db/schema/support";
import { and, eq, isNull } from "drizzle-orm";

// Operator-only. Never expose this as a public or authenticated user procedure.
export async function completeAccountDeletion(requestId: string) {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(accountDeletionRequest)
      .where(eq(accountDeletionRequest.id, requestId))
      .for("update");
    if (!request)
      throw new Error("No pending deletion request with this reference.");
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, request.userId))
      .for("update");
    const owned = await tx
      .select({ id: group.id })
      .from(group)
      .where(eq(group.ownerId, request.userId));
    if (owned.length)
      throw new Error(
        "The account still owns groups. Ask the owner to transfer or explicitly delete them first.",
      );
    // Personal recipes use SET NULL, so remove them explicitly before the user.
    await tx
      .delete(recipe)
      .where(and(eq(recipe.userId, request.userId), isNull(recipe.groupId)));
    // Cascades remove private activity, credentials, memberships, imports and requests.
    // Shared recipes survive with their contributor and deletedBy links set to null.
    await tx.delete(user).where(eq(user.id, request.userId));
    return { deleted: true };
  });
}
