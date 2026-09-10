import { recipe } from "@prep-sheet/db/schema/recipe";
import { recipeTag, tag } from "@prep-sheet/db/schema/tag";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { Database } from "../groups/access";

export async function persistRecipe(
  database: Database,
  value: typeof recipe.$inferInsert,
  tagIds: string[],
) {
  const inserted = await database
    .insert(recipe)
    .values(value)
    .onConflictDoNothing()
    .returning({ id: recipe.id });
  if (!inserted.length) return false;
  if (!tagIds.length || !value.userId) return true;
  const userId = value.userId;
  const valid = await database
    .select({ id: tag.id })
    .from(tag)
    .where(
      and(
        inArray(tag.id, tagIds),
        or(isNull(tag.userId), eq(tag.userId, userId)),
      ),
    );
  if (valid.length)
    await database
      .insert(recipeTag)
      .values(valid.map((t) => ({ userId, recipeId: value.id, tagId: t.id })))
      .onConflictDoNothing();
  return true;
}
