import { user } from "@prep-sheet/db/schema/auth";
import { recipeImport } from "@prep-sheet/db/schema/import";
import { recipe } from "@prep-sheet/db/schema/recipe";
import { TRPCError } from "@trpc/server";
import { and, count, eq, gte, inArray, ne, or } from "drizzle-orm";
import type { Database } from "../groups/access";

// Call inside a transaction. Every save/admission takes the same account lock.
export async function checkRecipeUsage(tx: Database, userId: string) {
  await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .for("update");
  const since = new Date(Date.now() - 86_400_000);
  const [saved] = await tx
    .select({ total: count() })
    .from(recipe)
    .where(and(eq(recipe.userId, userId), gte(recipe.createdAt, since)));
  const [reserved] = await tx
    .select({ total: count() })
    .from(recipeImport)
    .where(
      and(
        eq(recipeImport.userId, userId),
        ne(recipeImport.state, "saved"),
        or(
          gte(recipeImport.createdAt, since),
          inArray(recipeImport.state, ["queued", "processing", "ready"]),
        ),
      ),
    );
  if ((saved?.total ?? 0) + (reserved?.total ?? 0) >= 50)
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "You've used 50 recipe saves or import attempts today. Come back tomorrow for more.",
    });
}
