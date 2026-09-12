import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ShoppingPlan } from "../shopping-plan";
import { user } from "./auth";

export const shoppingItem = pgTable(
  "shopping_item",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    status: text("status", { enum: ["needed", "bought", "owned"] })
      .notNull()
      .default("needed"),
    // Keep attribution even if the source recipe is deleted.
    recipeId: uuid("recipe_id"),
    recipeTitle: text("recipe_title"),
    servings: text("servings"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("shopping_item_user_idx").on(table.userId)],
);

export const shoppingPlan = pgTable("shopping_plan", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  id: uuid("id").notNull(),
  content: jsonb("content").$type<ShoppingPlan>().notNull(),
  sources: jsonb("sources")
    .$type<{ id: string; text: string }[]>()
    .notNull()
    .default([]),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
});
