import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { recipe } from "./recipe";

export const tag = pgTable(
  "tag",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
  },
  (t) => [uniqueIndex("tag_user_name_idx").on(t.userId, sql`lower(${t.name})`)],
);

export const recipeTag = pgTable(
  "recipe_tag",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.recipeId, t.tagId] }),
    index("recipe_tag_tag_idx").on(t.tagId),
    index("recipe_tag_recipe_idx").on(t.recipeId),
  ],
);
