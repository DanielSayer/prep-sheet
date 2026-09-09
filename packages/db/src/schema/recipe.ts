import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { RecipeContent } from "../recipe-content";
import { user } from "./auth";
import { group } from "./group";

export const recipe = pgTable(
  "recipe",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    groupId: uuid("group_id").references(() => group.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    content: jsonb("content").$type<RecipeContent>().notNull(),
    sourceUrl: text("source_url"),
    origin: text("origin", {
      enum: ["imported", "generated", "manual"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("recipe_user_created_idx").on(table.userId, table.createdAt),
    index("recipe_group_created_idx").on(table.groupId, table.createdAt),
  ],
);

export const recipeFavourite = pgTable(
  "recipe_favourite",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.recipeId] }),
    index("recipe_favourite_recipe_idx").on(table.recipeId),
  ],
);

export const recipeRating = pgTable(
  "recipe_rating",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.recipeId] }),
    index("recipe_rating_recipe_idx").on(table.recipeId),
    check("recipe_rating_value_check", sql`${table.rating} between 1 and 5`),
  ],
);
