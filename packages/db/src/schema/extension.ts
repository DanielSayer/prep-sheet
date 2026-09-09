import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const extensionGrant = pgTable(
  "extension_grant",
  {
    codeHash: text("code_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    extensionId: text("extension_id").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    challenge: text("challenge").notNull(),
    state: text("state").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("extension_grant_expiry_idx").on(table.expiresAt)],
);

export const extensionCredential = pgTable(
  "extension_credential",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    extensionId: text("extension_id").notNull(),
    scope: text("scope").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [index("extension_credential_user_idx").on(table.userId)],
);
