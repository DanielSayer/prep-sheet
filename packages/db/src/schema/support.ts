import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const supportRequest = pgTable(
  "support_request",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("support_request_user_idx").on(table.userId, table.createdAt),
  ],
);

// One pending request per account. Cancellation removes the request.
export const accountDeletionRequest = pgTable("account_deletion_request", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  id: uuid("id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
