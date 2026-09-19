import { createDb } from "@prep-sheet/db";
import * as schema from "@prep-sheet/db/schema/auth";
import { env } from "@prep-sheet/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, freshSessionMiddleware } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",

      schema: schema,
    }),
    trustedOrigins: [env.BETTER_AUTH_URL],
    session: { freshAge: 10 * 60 },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/link-social") await freshSessionMiddleware(ctx);
      }),
    },
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        allowDifferentEmails: false,
      },
    },
    socialProviders: {
      ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
        ? {
            discord: {
              clientId: env.DISCORD_CLIENT_ID,
              clientSecret: env.DISCORD_CLIENT_SECRET,
            },
          }
        : {}),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    onAPIError: {
      errorURL: `${env.BETTER_AUTH_URL.replace(/\/$/, "")}/login`,
    },
    plugins: [tanstackStartCookies()],
  });
}

export const auth = createAuth();
