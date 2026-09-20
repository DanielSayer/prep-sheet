import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const billingAccount = pgTable("billing_account", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  customerId: text("customer_id").unique(),
  status: text("status").notNull().default("free"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  trialUsed: boolean("trial_used").notNull().default(false),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  checkoutUrl: text("checkout_url"),
  checkoutExpiresAt: timestamp("checkout_expires_at", { withTimezone: true }),
});

// No account data or cascading foreign key: deleting an account must not refund spend.
export const aiSpend = pgTable("ai_spend", {
  importId: uuid("import_id").primaryKey(),
  reservedCents: integer("reserved_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
