import { createHash, randomUUID } from "node:crypto";
import { db } from "@prep-sheet/db";
import {
  type Allocation,
  coverageInput,
  type Demand,
  type Meal,
  type MealTrip,
  mealInput,
  mealIssues,
  sameDemand,
  scaleIngredient,
  shoppingDemands,
  tripIsStale,
} from "@prep-sheet/db/meal-planner";
import { user } from "@prep-sheet/db/schema/auth";
import { mealPlanner } from "@prep-sheet/db/schema/meal-planner";
import { recipe } from "@prep-sheet/db/schema/recipe";
import { shoppingItem, shoppingPlan } from "@prep-sheet/db/schema/shopping";
import { generateShoppingPlan } from "@prep-sheet/db/shopping-plan";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { accessibleRecipe, type Database } from "../groups/access";
import { protectedProcedure, router } from "../index";

const tripInput = z.object({ coverage: coverageInput, replace: z.boolean() });
async function lock(tx: Database, userId: string) {
  await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .for("update");
}
async function state(tx: Database, userId: string) {
  const [saved] = await tx
    .select()
    .from(mealPlanner)
    .where(eq(mealPlanner.userId, userId));
  return saved ?? { userId, meals: [], revision: 0, trip: null };
}
function conflict() {
  return new TRPCError({
    code: "CONFLICT",
    message:
      "Your plan or shopping list changed. Refresh and review it again before saving.",
  });
}
async function saveState(
  tx: Database,
  saved: Awaited<ReturnType<typeof state>>,
) {
  await tx
    .insert(mealPlanner)
    .values(saved)
    .onConflictDoUpdate({ target: mealPlanner.userId, set: saved });
}
type Item = typeof shoppingItem.$inferSelect;
type ItemWrite = typeof shoppingItem.$inferInsert;
type Change = {
  kind: "add" | "remove" | "change" | "keep";
  title: string;
  before: string | null;
  after: string | null;
};

function reconcile(
  items: Item[],
  demands: Demand[],
  trip: MealTrip | null,
  replace: boolean,
  userId: string,
) {
  const removed: string[] = [];
  const additions: ItemWrite[] = [];
  const allocations: Allocation[] = [];
  const changes: Change[] = [];
  const warnings = new Set<string>();
  const previous = new Map(trip?.demands.map((demand) => [demand.key, demand]));
  const byId = new Map(items.map((item) => [item.id, item]));
  const activeKeys = new Set(demands.map((demand) => demand.key));
  for (const item of items) {
    const allocation = trip?.allocations.find(
      (entry) => entry.itemId === item.id,
    );
    if ((replace || !trip) && item.recipeId) {
      removed.push(item.id);
      changes.push({
        kind: "remove",
        title: item.recipeTitle ?? "Recipe",
        before: item.text,
        after: null,
      });
    } else if (allocation && !activeKeys.has(allocation.key)) {
      if (item.status === "needed") {
        removed.push(item.id);
        changes.push({
          kind: "remove",
          title: item.recipeTitle ?? "Recipe",
          before: item.text,
          after: null,
        });
      } else
        changes.push({
          kind: "keep",
          title: item.recipeTitle ?? "Recipe",
          before: item.text,
          after: `Kept as ${item.status === "owned" ? "already owned" : "bought"}; no longer needed for these meals.`,
        });
    }
  }
  for (const demand of demands) {
    const old = replace ? undefined : previous.get(demand.key);
    const cleared =
      !replace && old?.text === demand.text && old.recipeId === demand.recipeId
        ? (trip?.allocations.filter(
            (allocation) =>
              allocation.key === demand.key && allocation.clearedBought,
          ) ?? [])
        : [];
    allocations.push(...cleared);
    const existing = replace
      ? []
      : (
          trip?.allocations.filter(
            (allocation) => allocation.key === demand.key,
          ) ?? []
        ).flatMap((allocation) => {
          const item = byId.get(allocation.itemId);
          return item ? [{ allocation, item }] : [];
        });
    if (old && sameDemand(demand, old)) {
      allocations.push(...existing.map(({ allocation }) => allocation));
      continue;
    }
    let covered = cleared.reduce(
      (total, allocation) => total + allocation.factor,
      0,
    );
    for (const { allocation, item } of existing) {
      if (item.status !== "needed") {
        if (old?.text === demand.text && old.recipeId === demand.recipeId) {
          covered += allocation.factor;
          allocations.push(allocation);
        }
        changes.push({
          kind: "keep",
          title: demand.title,
          before: item.text,
          after: `Keep ${item.status === "owned" ? "already owned" : "bought"} quantity.`,
        });
      } else removed.push(item.id);
    }
    const remaining = Math.max(0, demand.factor - covered);
    if (remaining > 0.000001) {
      const scaled = scaleIngredient(demand.text, remaining);
      if (scaled.uncertain) warnings.add(`${demand.title}: ${scaled.text}`);
      const id = randomUUID();
      additions.push({
        id,
        userId,
        text: scaled.text,
        recipeId: demand.recipeId,
        recipeTitle: demand.title,
        servings: `${demand.servings} servings planned`,
        position: additions.length,
      });
      allocations.push({ key: demand.key, itemId: id, factor: remaining });
      changes.push({
        kind: old ? "change" : "add",
        title: demand.title,
        before:
          existing
            .filter(({ item }) => item.status === "needed")
            .map(({ item }) => item.text)
            .join("; ") || null,
        after: scaled.text,
      });
    } else if (existing.some(({ item }) => item.status === "needed")) {
      changes.push({
        kind: "remove",
        title: demand.title,
        before: existing
          .filter(({ item }) => item.status === "needed")
          .map(({ item }) => item.text)
          .join("; "),
        after: "Covered by bought or already-owned quantities.",
      });
    }
  }
  // Unlinked groceries, including manual edits/additions, are kept on updates.
  const retained = items.filter((item) => !removed.includes(item.id));
  if (retained.length + additions.length > 1000)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This trip exceeds 1,000 ingredients. Choose fewer meals.",
    });
  return {
    removed,
    additions,
    allocations,
    changes: changes.sort(
      (a, b) => a.title.localeCompare(b.title) || a.kind.localeCompare(b.kind),
    ),
    warnings: [...warnings],
    retained,
  };
}

async function preview(
  tx: Database,
  userId: string,
  input: z.infer<typeof tripInput>,
) {
  const saved = await state(tx, userId);
  const items = await tx
    .select()
    .from(shoppingItem)
    .where(eq(shoppingItem.userId, userId))
    .orderBy(shoppingItem.id);
  const demands = shoppingDemands(saved.meals, input.coverage);
  const coveredMeals = saved.meals.filter(
    (meal) =>
      meal.date >= input.coverage.start && meal.date <= input.coverage.end,
  );
  const issues = mealIssues(saved.meals).filter((issue) =>
    coveredMeals.some((meal) => meal.id === issue.id),
  );
  const result = reconcile(items, demands, saved.trip, input.replace, userId);
  const token = createHash("sha256")
    .update(JSON.stringify({ saved, items, input }))
    .digest("hex");
  return { saved, demands, result, token, issues, meals: coveredMeals };
}

export const plannerRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const saved = await state(db, ctx.session.user.id);
    return {
      ...saved,
      issues: mealIssues(saved.meals),
      stale: saved.trip ? tripIsStale(saved.meals, saved.trip) : false,
    };
  }),
  save: protectedProcedure
    .input(z.object({ revision: z.number().int().min(0), meal: mealInput }))
    .mutation(({ ctx, input }) =>
      db.transaction(async (tx) => {
        const userId = ctx.session.user.id;
        await lock(tx, userId);
        const saved = await state(tx, userId);
        if (saved.revision !== input.revision) throw conflict();
        const old = saved.meals.find((meal) => meal.id === input.meal.id);
        let meal: Meal;
        if (input.meal.kind === "recipe") {
          if (old?.kind === "recipe" && old.recipeId === input.meal.recipeId)
            meal = {
              ...input.meal,
              title: old.title,
              ingredients: old.ingredients,
            };
          else {
            const [source] = await tx
              .select()
              .from(recipe)
              .where(
                and(
                  eq(recipe.id, input.meal.recipeId),
                  accessibleRecipe(userId),
                ),
              );
            if (!source)
              throw new TRPCError({
                code: "NOT_FOUND",
                message:
                  "That recipe is no longer available. Choose another recipe.",
              });
            meal = {
              ...input.meal,
              title: source.title,
              ingredients: source.content.ingredients,
            };
          }
        } else {
          meal = input.meal;
          if (meal.kind === "leftovers") {
            const sourceId = meal.sourceId;
            const source = saved.meals.find(
              (entry) => entry.id === sourceId && entry.kind === "recipe",
            );
            if (!source)
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Choose an existing cooking session for these leftovers.",
              });
          }
        }
        const meals = [
          ...saved.meals.filter((entry) => entry.id !== meal.id),
          meal,
        ].sort(
          (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
        );
        if (meals.length > 1000)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Your planner is full. Remove older meals before adding more.",
          });
        await saveState(tx, { ...saved, meals, revision: saved.revision + 1 });
      }),
    ),
  remove: protectedProcedure
    .input(z.object({ id: z.uuid(), revision: z.number().int().min(0) }))
    .mutation(({ ctx, input }) =>
      db.transaction(async (tx) => {
        await lock(tx, ctx.session.user.id);
        const saved = await state(tx, ctx.session.user.id);
        if (saved.revision !== input.revision) throw conflict();
        await saveState(tx, {
          ...saved,
          revision: saved.revision + 1,
          meals: saved.meals.filter((meal) => meal.id !== input.id),
        });
      }),
    ),
  preview: protectedProcedure.input(tripInput).query(async ({ ctx, input }) => {
    const result = await preview(db, ctx.session.user.id, input);
    return {
      token: result.token,
      issues: result.issues,
      meals: result.meals,
      changes: result.result.changes,
      warnings: result.result.warnings,
    };
  }),
  applyTrip: protectedProcedure
    .input(tripInput.extend({ token: z.string().length(64) }))
    .mutation(({ ctx, input }) =>
      db.transaction(async (tx) => {
        const userId = ctx.session.user.id;
        await lock(tx, userId);
        const reviewed = await preview(tx, userId, {
          coverage: input.coverage,
          replace: input.replace,
        });
        if (reviewed.token !== input.token) throw conflict();
        if (reviewed.issues.length)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Resolve the leftover warnings before generating this trip.",
          });
        const { removed, additions, allocations, retained } = reviewed.result;
        if (removed.length)
          await tx
            .delete(shoppingItem)
            .where(
              and(
                eq(shoppingItem.userId, userId),
                inArray(shoppingItem.id, removed),
              ),
            );
        if (additions.length) await tx.insert(shoppingItem).values(additions);
        const trip: MealTrip = {
          ...input.coverage,
          demands: reviewed.demands,
          allocations,
        };
        await saveState(tx, {
          ...reviewed.saved,
          trip,
          revision: reviewed.saved.revision + 1,
        });
        const items = [...retained, ...additions].filter(
          (item) => item.status !== "owned",
        );
        const plan = {
          userId,
          id: randomUUID(),
          content: generateShoppingPlan(items),
          sources: items.map(({ id, text }) => ({ id, text })),
          generatedAt: new Date(),
        };
        await tx
          .insert(shoppingPlan)
          .values(plan)
          .onConflictDoUpdate({ target: shoppingPlan.userId, set: plan });
      }),
    ),
});
