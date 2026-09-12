import { randomUUID } from "node:crypto";
import { db } from "@prep-sheet/db";
import { user } from "@prep-sheet/db/schema/auth";
import { recipe } from "@prep-sheet/db/schema/recipe";
import { shoppingItem, shoppingPlan } from "@prep-sheet/db/schema/shopping";
import { generateShoppingPlan } from "@prep-sheet/db/shopping-plan";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { accessibleRecipe, type Database } from "../groups/access";
import { protectedProcedure, router } from "../index";

const itemText = z.string().trim().min(1).max(2000);
const itemId = z.object({ id: z.uuid() });
async function lockList(tx: Database, userId: string) {
  await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .for("update");
}
function checkCapacity(count: number) {
  if (count > 1000)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Your list can hold up to 1,000 items. Clear some items before adding more.",
    });
}

export const shoppingRouter = router({
  generate: protectedProcedure.mutation(({ ctx }) =>
    db.transaction(async (tx) => {
      const userId = ctx.session.user.id;
      await lockList(tx, userId);
      const items = await tx
        .select()
        .from(shoppingItem)
        .where(
          and(
            eq(shoppingItem.userId, userId),
            eq(shoppingItem.status, "needed"),
          ),
        )
        .for("update");
      if (!items.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Add some items you still need before generating a list.",
        });
      const saved = {
        id: randomUUID(),
        userId,
        content: generateShoppingPlan(items),
        sources: items.map(({ id, text }) => ({ id, text })),
        generatedAt: new Date(),
      };
      await tx
        .insert(shoppingPlan)
        .values(saved)
        .onConflictDoUpdate({ target: shoppingPlan.userId, set: saved });
      return { id: saved.id };
    }),
  ),
  generated: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [plan] = await db
      .select()
      .from(shoppingPlan)
      .where(eq(shoppingPlan.userId, userId));
    if (!plan) return null;
    const items = await db
      .select()
      .from(shoppingItem)
      .where(eq(shoppingItem.userId, userId));
    const current = new Map(items.map((item) => [item.id, item]));
    const sources = new Set(plan.sources.map((item) => item.id));
    const stale =
      plan.sources.some((source) => {
        const item = current.get(source.id);
        return !item || item.text !== source.text || item.status === "owned";
      }) ||
      items.some((item) => item.status === "needed" && !sources.has(item.id));
    return { ...plan, items, stale };
  }),
  checkGroup: protectedProcedure
    .input(
      z.object({
        planId: z.uuid(),
        groupIndex: z.number().int().min(0),
        bought: z.boolean(),
      }),
    )
    .mutation(({ ctx, input }) =>
      db.transaction(async (tx) => {
        const userId = ctx.session.user.id;
        await lockList(tx, userId);
        const [plan] = await tx
          .select()
          .from(shoppingPlan)
          .where(
            and(
              eq(shoppingPlan.userId, userId),
              eq(shoppingPlan.id, input.planId),
            ),
          );
        const selected = plan?.content.groups[input.groupIndex];
        if (!plan || !selected)
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This generated list has changed. Refresh the page to continue.",
          });
        const items = await tx
          .select()
          .from(shoppingItem)
          .where(eq(shoppingItem.userId, userId))
          .for("update");
        const current = new Map(items.map((item) => [item.id, item]));
        const sourceIds = new Set(plan.sources.map((source) => source.id));
        if (
          plan.sources.some(
            (source) =>
              current.get(source.id)?.text !== source.text ||
              current.get(source.id)?.status === "owned",
          ) ||
          items.some(
            (item) => item.status === "needed" && !sourceIds.has(item.id),
          )
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Your ingredients have changed. Generate the list again before checking off items.",
          });
        }
        await tx
          .update(shoppingItem)
          .set({ status: input.bought ? "bought" : "needed" })
          .where(
            and(
              eq(shoppingItem.userId, userId),
              inArray(shoppingItem.id, selected.itemIds),
            ),
          );
      }),
    ),
  list: protectedProcedure.query(({ ctx }) =>
    db
      .select()
      .from(shoppingItem)
      .where(eq(shoppingItem.userId, ctx.session.user.id))
      .orderBy(
        asc(shoppingItem.createdAt),
        asc(shoppingItem.recipeId),
        asc(shoppingItem.position),
        asc(shoppingItem.id),
      ),
  ),
  recipes: protectedProcedure.query(({ ctx }) =>
    db
      .select({
        id: recipe.id,
        title: recipe.title,
        groupId: recipe.groupId,
        servings: recipe.content,
      })
      .from(recipe)
      .where(accessibleRecipe(ctx.session.user.id))
      .orderBy(asc(recipe.title))
      .then((rows) =>
        rows.map((row) => ({ ...row, servings: row.servings.servings })),
      ),
  ),
  addRecipes: protectedProcedure
    .input(z.object({ recipeIds: z.array(z.uuid()).min(1).max(100) }))
    .mutation(({ ctx, input }) =>
      db.transaction(async (tx) => {
        const userId = ctx.session.user.id;
        await lockList(tx, userId);
        const ids = [...new Set(input.recipeIds)];
        const sources = await tx
          .select()
          .from(recipe)
          .where(and(inArray(recipe.id, ids), accessibleRecipe(userId)));
        if (sources.length !== ids.length)
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "A selected recipe is no longer available. Review your selection and try again.",
          });
        const existing = await tx
          .select()
          .from(shoppingItem)
          .where(eq(shoppingItem.userId, userId));
        const alreadyAdded = new Set(existing.map((item) => item.recipeId));
        const additions = sources.filter(
          (source) => !alreadyAdded.has(source.id),
        );
        const items = additions.flatMap((source) =>
          source.content.ingredients.map((text, position) => ({
            id: randomUUID(),
            userId,
            text,
            recipeId: source.id,
            recipeTitle: source.title,
            servings: source.content.servings,
            position,
          })),
        );
        checkCapacity(existing.length + items.length);
        if (items.length) await tx.insert(shoppingItem).values(items);
        return { addedRecipes: additions.length, addedItems: items.length };
      }),
    ),
  addItem: protectedProcedure
    .input(itemId.extend({ text: itemText }))
    .mutation(({ ctx, input }) =>
      db.transaction(async (tx) => {
        const userId = ctx.session.user.id;
        await lockList(tx, userId);
        const existing = await tx
          .select({ id: shoppingItem.id })
          .from(shoppingItem)
          .where(eq(shoppingItem.userId, userId));
        if (existing.some((item) => item.id === input.id)) return;
        checkCapacity(existing.length + 1);
        await tx.insert(shoppingItem).values({ ...input, userId });
      }),
    ),
  updateItem: protectedProcedure
    .input(
      z.discriminatedUnion("kind", [
        itemId.extend({ kind: z.literal("text"), text: itemText }),
        itemId.extend({
          kind: z.literal("status"),
          status: z.enum(["needed", "bought", "owned"]),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await db
        .update(shoppingItem)
        .set(
          input.kind === "text"
            ? { text: input.text }
            : { status: input.status },
        )
        .where(
          and(
            eq(shoppingItem.id, input.id),
            eq(shoppingItem.userId, ctx.session.user.id),
          ),
        )
        .returning({ id: shoppingItem.id });
      if (!updated.length)
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "This item is no longer on your list. Refresh the list to continue.",
        });
    }),
  removeItem: protectedProcedure
    .input(itemId)
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(shoppingItem)
        .where(
          and(
            eq(shoppingItem.id, input.id),
            eq(shoppingItem.userId, ctx.session.user.id),
          ),
        );
    }),
  clear: protectedProcedure
    .input(z.object({ scope: z.enum(["bought", "all"]) }))
    .mutation(({ ctx, input }) =>
      db.transaction(async (tx) => {
        await lockList(tx, ctx.session.user.id);
        await tx
          .delete(shoppingItem)
          .where(
            and(
              eq(shoppingItem.userId, ctx.session.user.id),
              input.scope === "bought"
                ? eq(shoppingItem.status, "bought")
                : undefined,
            ),
          );
        if (input.scope === "all")
          await tx
            .delete(shoppingPlan)
            .where(eq(shoppingPlan.userId, ctx.session.user.id));
      }),
    ),
});
