import { db } from "@prep-sheet/db";
import { recipeContentSchema } from "@prep-sheet/db/recipe-content";
import { recipe } from "@prep-sheet/db/schema/recipe";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { z } from "zod";
import { accessibleRecipe, lockGroup, requireGroup } from "../groups/access";
import { protectedProcedure, router } from "../index";
import { generateRecipe } from "../recipes/generate";

const idInput = z.object({ id: z.uuid() });
const owned = (id: string, userId: string) =>
  and(eq(recipe.id, id), accessibleRecipe(userId));
const missing = () =>
  new TRPCError({ code: "NOT_FOUND", message: "Recipe not found." });

export async function getRecipe(id: string, userId: string) {
  const [result] = await db.select().from(recipe).where(owned(id, userId));
  if (!result) throw missing();
  return result;
}

export const recipesRouter = router({
  list: protectedProcedure
    .input(z.object({ groupId: z.uuid().nullable().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.groupId)
        await requireGroup(db, input.groupId, ctx.session.user.id);
      return db
        .select({
          id: recipe.id,
          title: recipe.title,
          content: recipe.content,
          origin: recipe.origin,
          createdAt: recipe.createdAt,
        })
        .from(recipe)
        .where(
          and(
            accessibleRecipe(ctx.session.user.id),
            input?.groupId
              ? eq(recipe.groupId, input.groupId)
              : isNull(recipe.groupId),
          ),
        )
        .orderBy(desc(recipe.createdAt));
    }),
  get: protectedProcedure
    .input(idInput)
    .query(({ input, ctx }) => getRecipe(input.id, ctx.session.user.id)),
  create: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        input: z.string().trim().min(3).max(20000),
        groupId: z.uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      if (input.groupId) await requireGroup(db, input.groupId, userId);
      const [existing] = await db
        .select()
        .from(recipe)
        .where(owned(input.id, userId));
      if (existing) {
        if (existing.groupId !== (input.groupId ?? null))
          throw new TRPCError({
            code: "CONFLICT",
            message: "This recipe was already saved to another collection.",
          });
        return existing;
      }
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
      await db.transaction(async (tx) => {
        if (input.groupId) {
          await lockGroup(tx, input.groupId);
          await requireGroup(tx, input.groupId, userId);
        }
        await tx
          .insert(recipe)
          .values({
            id: input.id,
            userId,
            groupId: input.groupId ?? null,
            title: result.content.title,
            ...result,
          })
          .onConflictDoNothing();
      });
      return getRecipe(input.id, userId);
    }),
  copy: protectedProcedure
    .input(idInput.extend({ newId: z.uuid(), groupId: z.uuid().nullable() }))
    .mutation(({ input, ctx }) =>
      db.transaction(async (tx) => {
        const userId = ctx.session.user.id;
        if (input.groupId) {
          await lockGroup(tx, input.groupId);
          await requireGroup(tx, input.groupId, userId);
        }
        const [source] = await tx
          .select()
          .from(recipe)
          .where(owned(input.id, userId));
        if (!source) throw missing();
        const [saved] = await tx
          .insert(recipe)
          .values({
            id: input.newId,
            userId,
            groupId: input.groupId,
            title: source.title,
            content: source.content,
            sourceUrl: source.sourceUrl,
            origin: source.origin,
          })
          .onConflictDoNothing()
          .returning({ id: recipe.id });
        if (!saved)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This copy has already been saved. Refresh your collection.",
          });
        return saved;
      }),
    ),
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
