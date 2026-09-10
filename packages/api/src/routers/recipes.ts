import { db } from "@prep-sheet/db";
import { recipeContentSchema } from "@prep-sheet/db/recipe-content";
import {
  recipe,
  recipeFavourite,
  recipeRating,
} from "@prep-sheet/db/schema/recipe";
import { recipeTag, tag } from "@prep-sheet/db/schema/tag";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, getTableColumns, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { accessibleRecipe, lockGroup, requireGroup } from "../groups/access";
import { protectedProcedure, router } from "../index";
import { generateRecipe } from "../recipes/generate";
import { persistRecipe } from "../recipes/persist";
import { checkRecipeUsage } from "../recipes/usage";
import { availableTags } from "./tags";

const idInput = z.object({ id: z.uuid() });
const owned = (id: string, userId: string) =>
  and(eq(recipe.id, id), accessibleRecipe(userId));
const missing = () =>
  new TRPCError({ code: "NOT_FOUND", message: "Recipe not found." });

const favouriteOf = (userId: string) => sql<boolean>`exists (
  select 1 from ${recipeFavourite}
  where ${recipeFavourite.recipeId} = ${recipe.id}
    and ${recipeFavourite.userId} = ${userId}
)`;

const ratingOf = (userId: string) => sql<number | null>`(
  select ${recipeRating.rating} from ${recipeRating}
  where ${recipeRating.recipeId} = ${recipe.id}
    and ${recipeRating.userId} = ${userId}
)`;

const tagsOf = (userId: string) => sql<string[]>`coalesce((
  select json_agg(${recipeTag.tagId}) from ${recipeTag}
  where ${recipeTag.recipeId} = ${recipe.id} and ${recipeTag.userId} = ${userId}
), '[]'::json)`;

export async function getRecipe(id: string, userId: string) {
  const [result] = await db
    .select({
      ...getTableColumns(recipe),
      isFavourite: favouriteOf(userId),
      rating: ratingOf(userId),
      tagIds: tagsOf(userId),
    })
    .from(recipe)
    .where(owned(id, userId));
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
          isFavourite: favouriteOf(ctx.session.user.id),
          rating: ratingOf(ctx.session.user.id),
          tagIds: tagsOf(ctx.session.user.id),
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
  setTag: protectedProcedure
    .input(idInput.extend({ tagId: z.uuid(), selected: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      await getRecipe(input.id, userId);
      const [available] = await db
        .select()
        .from(tag)
        .where(
          and(
            eq(tag.id, input.tagId),
            or(isNull(tag.userId), eq(tag.userId, userId)),
          ),
        );
      if (!available)
        throw new TRPCError({ code: "NOT_FOUND", message: "Tag not found." });
      if (input.selected)
        await db
          .insert(recipeTag)
          .values({ userId, recipeId: input.id, tagId: input.tagId })
          .onConflictDoNothing();
      else
        await db
          .delete(recipeTag)
          .where(
            and(
              eq(recipeTag.userId, userId),
              eq(recipeTag.recipeId, input.id),
              eq(recipeTag.tagId, input.tagId),
            ),
          );
      return { success: true };
    }),
  setFavourite: protectedProcedure
    .input(idInput.extend({ isFavourite: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      await getRecipe(input.id, userId);
      if (input.isFavourite) {
        await db
          .insert(recipeFavourite)
          .values({ userId, recipeId: input.id })
          .onConflictDoNothing();
      } else {
        await db
          .delete(recipeFavourite)
          .where(
            and(
              eq(recipeFavourite.userId, userId),
              eq(recipeFavourite.recipeId, input.id),
            ),
          );
      }
      return { id: input.id, isFavourite: input.isFavourite };
    }),
  setRating: protectedProcedure
    .input(
      idInput.extend({ rating: z.number().int().min(1).max(5).nullable() }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      await getRecipe(input.id, userId);
      if (input.rating === null) {
        await db
          .delete(recipeRating)
          .where(
            and(
              eq(recipeRating.userId, userId),
              eq(recipeRating.recipeId, input.id),
            ),
          );
      } else {
        await db
          .insert(recipeRating)
          .values({ userId, recipeId: input.id, rating: input.rating })
          .onConflictDoUpdate({
            target: [recipeRating.userId, recipeRating.recipeId],
            set: { rating: input.rating },
          });
      }
      return { id: input.id, rating: input.rating };
    }),
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
      await db.transaction((tx) => checkRecipeUsage(tx, userId));
      const { tagIds = [], ...result } = await generateRecipe(
        input.input,
        await availableTags(userId),
      );
      await db.transaction(async (tx) => {
        await checkRecipeUsage(tx, userId);
        if (input.groupId) {
          await lockGroup(tx, input.groupId);
          await requireGroup(tx, input.groupId, userId);
        }
        await persistRecipe(
          tx,
          {
            id: input.id,
            userId,
            groupId: input.groupId ?? null,
            title: result.content.title,
            ...result,
          },
          tagIds,
        );
      });
      return getRecipe(input.id, userId);
    }),
  createManual: protectedProcedure
    .input(
      idInput.extend({
        content: recipeContentSchema,
        groupId: z.uuid().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
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
            groupId: input.groupId,
            title: input.content.title,
            content: input.content,
            origin: "manual",
            sourceUrl: null,
          })
          .onConflictDoNothing();
      });
      const saved = await getRecipe(input.id, userId);
      if (
        saved.userId !== userId ||
        saved.groupId !== input.groupId ||
        saved.origin !== "manual"
      )
        throw new TRPCError({
          code: "CONFLICT",
          message: "This recipe ID has already been used. Start a new recipe.",
        });
      return saved;
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
        const sourceTags = await tx
          .select({ tagId: recipeTag.tagId })
          .from(recipeTag)
          .where(
            and(eq(recipeTag.recipeId, input.id), eq(recipeTag.userId, userId)),
          );
        if (sourceTags.length)
          await tx
            .insert(recipeTag)
            .values(
              sourceTags.map((t) => ({ ...t, userId, recipeId: saved.id })),
            );
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
