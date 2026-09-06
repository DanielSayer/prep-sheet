import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { RecipeContent } from "../recipe-content";
import { user } from "./auth";

export const recipe = pgTable(
  "recipe",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: jsonb("content").$type<RecipeContent>().notNull(),
    sourceUrl: text("source_url"),
    origin: text("origin", { enum: ["imported", "generated"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("recipe_user_created_idx").on(table.userId, table.createdAt),
  ],
);
