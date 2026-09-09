import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "@prep-sheet/db";
import { user } from "@prep-sheet/db/schema/auth";
import {
  extensionCredential,
  extensionGrant,
} from "@prep-sheet/db/schema/extension";
import { env } from "@prep-sheet/env/server";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { z } from "zod";
import {
  authorizationSchema,
  exchangeSchema,
  extensionIdSchema,
} from "./extension-contract";

export const extensionScope = "account:read collections:read recipes:import";
export const hashSecret = (value: string) =>
  createHash("sha256").update(value).digest("base64url");
const secret = () => randomBytes(32).toString("base64url");

export function allowedExtensionIds() {
  const configured = env.EXTENSION_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  // A development identity must never be implicitly trusted by a deployed site.
  const local = new URL(env.BETTER_AUTH_URL).hostname === "localhost";
  return z
    .array(extensionIdSchema)
    .parse(
      configured ??
        (local && env.NODE_ENV !== "production"
          ? ["kjmnecmcpdklkaaiklbfoialfdiamabj"]
          : []),
    );
}

export function validateAuthorization(value: unknown) {
  const input = authorizationSchema.parse(value);
  if (
    !allowedExtensionIds().includes(input.extensionId) ||
    input.redirectUri !==
      `https://${input.extensionId}.chromiumapp.org/prep-sheet`
  ) {
    throw new Error("Invalid extension destination");
  }
  return input;
}

export async function issueExtensionCode(userId: string, value: unknown) {
  const input = validateAuthorization(value);
  const code = secret();
  await db
    .delete(extensionGrant)
    .where(lt(extensionGrant.expiresAt, new Date()));
  await db.insert(extensionGrant).values({
    ...input,
    userId,
    codeHash: hashSecret(code),
    expiresAt: new Date(Date.now() + 120_000),
  });
  const callback = new URL(input.redirectUri);
  callback.searchParams.set("code", code);
  callback.searchParams.set("state", input.state);
  return callback.href;
}

export async function exchangeExtensionCode(value: unknown) {
  const input = exchangeSchema.parse(value);
  validateAuthorization(input);
  const token = `pse_${secret()}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return db.transaction(async (tx) => {
    // DELETE RETURNING is atomic, including concurrent exchanges of the same code.
    const [grant] = await tx
      .delete(extensionGrant)
      .where(
        and(
          eq(extensionGrant.codeHash, hashSecret(input.code)),
          eq(extensionGrant.extensionId, input.extensionId),
          eq(extensionGrant.redirectUri, input.redirectUri),
          eq(extensionGrant.state, input.state),
          eq(extensionGrant.challenge, input.challenge),
          eq(extensionGrant.challenge, hashSecret(input.verifier)),
          gt(extensionGrant.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!grant) return null;
    const [account] = await tx
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, grant.userId));
    if (!account) throw new Error("Account unavailable");
    await tx.insert(extensionCredential).values({
      id: randomUUID(),
      tokenHash: hashSecret(token),
      userId: grant.userId,
      extensionId: input.extensionId,
      scope: extensionScope,
      expiresAt,
    });
    return { token, expiresAt: expiresAt.toISOString(), account };
  });
}

export async function authenticateExtension(request: Request) {
  const origin = request.headers.get("origin");
  const extensionId = allowedExtensionIds().find(
    (id) => origin === `chrome-extension://${id}`,
  );
  const authorization = request.headers.get("authorization");
  if (
    !extensionId ||
    !authorization ||
    !/^Bearer pse_[A-Za-z0-9_-]{43}$/.test(authorization)
  )
    return null;
  const [result] = await db
    .select({
      credentialId: extensionCredential.id,
      expiresAt: extensionCredential.expiresAt,
      scope: extensionCredential.scope,
      account: { id: user.id, name: user.name, email: user.email },
    })
    .from(extensionCredential)
    .innerJoin(user, eq(user.id, extensionCredential.userId))
    .where(
      and(
        eq(extensionCredential.tokenHash, hashSecret(authorization.slice(7))),
        eq(extensionCredential.extensionId, extensionId),
        isNull(extensionCredential.revokedAt),
        gt(extensionCredential.expiresAt, new Date()),
      ),
    );
  return result ?? null;
}

export async function listExtensions(userId: string) {
  return db
    .select({
      id: extensionCredential.id,
      extensionId: extensionCredential.extensionId,
      createdAt: extensionCredential.createdAt,
      expiresAt: extensionCredential.expiresAt,
    })
    .from(extensionCredential)
    .where(
      and(
        eq(extensionCredential.userId, userId),
        isNull(extensionCredential.revokedAt),
        gt(extensionCredential.expiresAt, new Date()),
      ),
    );
}

export async function revokeExtension(userId: string, id: string) {
  await db
    .update(extensionCredential)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(extensionCredential.id, id),
        eq(extensionCredential.userId, userId),
      ),
    );
}
