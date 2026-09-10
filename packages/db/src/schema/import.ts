import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { RecipeContent } from "../recipe-content";
import { user } from "./auth";

export const recipeImport = pgTable(
  "recipe_import",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Keep the destination if a group is deleted. Never silently save personally.
    groupId: uuid("group_id"),
    fingerprint: text("fingerprint").notNull(),
    input: text("input").notNull(),
    sourceUrl: text("source_url").notNull(),
    state: text("state", {
      enum: ["queued", "processing", "ready", "saved", "failed"],
    })
      .notNull()
      .default("queued"),
    generated: jsonb("generated").$type<{
      content: RecipeContent;
      tagIds: string[];
    }>(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
  },
  (t) => [
    index("recipe_import_queue_idx").on(t.state, t.createdAt),
    index("recipe_import_user_idx").on(t.userId, t.createdAt),
  ],
);

export const extensionRate = pgTable("extension_rate", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  window: timestamp("window", { withTimezone: true }).notNull(),
  requests: integer("requests").notNull(),
});
