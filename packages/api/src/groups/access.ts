import { db } from "@prep-sheet/db";
import { group, groupMember } from "@prep-sheet/db/schema/group";
import { recipe } from "@prep-sheet/db/schema/recipe";
import { TRPCError } from "@trpc/server";
import { and, eq, exists, isNull, or } from "drizzle-orm";

export type Database =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const memberOf = (userId: string) =>
  exists(
    db
      .select({ id: groupMember.userId })
      .from(groupMember)
      .where(
        and(
          eq(groupMember.groupId, recipe.groupId),
          eq(groupMember.userId, userId),
        ),
      ),
  );

export const accessibleRecipe = (userId: string) =>
  or(and(isNull(recipe.groupId), eq(recipe.userId, userId)), memberOf(userId));

export async function requireGroup(
  database: Database,
  id: string,
  userId: string,
  ownerOnly = false,
) {
  const [result] = await database
    .select()
    .from(group)
    .innerJoin(groupMember, eq(groupMember.groupId, group.id))
    .where(and(eq(group.id, id), eq(groupMember.userId, userId)));
  if (!result)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Group not found or you no longer have access.",
    });
  if (ownerOnly && result.group.ownerId !== userId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the group owner can do this.",
    });
  return result.group;
}

// Serialize membership changes, invite acceptance and recipe inserts for this group.
export async function lockGroup(database: Database, id: string) {
  await database
    .select({ id: group.id })
    .from(group)
    .where(eq(group.id, id))
    .for("update");
}
