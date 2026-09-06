import { db } from "@prep-sheet/db";
import { recipeContentSchema } from "@prep-sheet/db/recipe-content";
import { recipe } from "@prep-sheet/db/schema/recipe";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { generateRecipe } from "../recipes/generate";

const idInput = z.object({ id: z.uuid() });
const owned = (id: string, userId: string) =>
  and(eq(recipe.id, id), eq(recipe.userId, userId));
const missing = () =>
  new TRPCError({ code: "NOT_FOUND", message: "Recipe not found." });

export async function getRecipe(id: string, userId: string) {
  const [result] = await db.select().from(recipe).where(owned(id, userId));
  if (!result) throw missing();
  return result;
}

export const recipesRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    db
      .select({
        id: recipe.id,
        title: recipe.title,
        content: recipe.content,
        origin: recipe.origin,
        createdAt: recipe.createdAt,
      })
      .from(recipe)
      .where(eq(recipe.userId, ctx.session.user.id))
      .orderBy(desc(recipe.createdAt)),
  ),
  get: protectedProcedure
    .input(idInput)
    .query(({ input, ctx }) => getRecipe(input.id, ctx.session.user.id)),
  create: protectedProcedure
    .input(
      z.object({ id: z.uuid(), input: z.string().trim().min(3).max(20000) }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const [existing] = await db
        .select()
        .from(recipe)
        .where(owned(input.id, userId));
      if (existing) return existing;
      const [usage] = await db
        .select({ total: count() })
        .from(recipe)
        .where(
          and(
            eq(recipe.userId, userId),
            gte(recipe.createdAt, new Date(Date.now() - 86400000)),
          ),
        );
      if (usage && usage.total >= 50)
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "You've saved 50 recipes today. Come back tomorrow for more.",
        });
      const result = await generateRecipe(input.input);
      await db
        .insert(recipe)
        .values({
          id: input.id,
          userId,
          title: result.content.title,
          ...result,
        })
        .onConflictDoNothing();
      return getRecipe(input.id, userId);
    }),
  update: protectedProcedure
    .input(idInput.extend({ content: recipeContentSchema }))
    .mutation(async ({ input, ctx }) => {
      const [result] = await db
        .update(recipe)
        .set({
          title: input.content.title,
          content: input.content,
          updatedAt: new Date(),
        })
        .where(owned(input.id, ctx.session.user.id))
        .returning();
      if (!result) throw missing();
      return result;
    }),
  delete: protectedProcedure.input(idInput).mutation(async ({ input, ctx }) => {
    const deleted = await db
      .delete(recipe)
      .where(owned(input.id, ctx.session.user.id))
      .returning({ id: recipe.id });
    if (!deleted.length) throw missing();
    return { success: true };
  }),
});
