import { z } from "zod";

export const extensionIdSchema = z.string().regex(/^[a-p]{32}$/);
export const authorizationSchema = z.object({
  extensionId: extensionIdSchema,
  redirectUri: z.string().max(200),
  state: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export const exchangeSchema = authorizationSchema.extend({
  code: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
});
export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});
export const credentialSchema = z.object({
  token: z.string().regex(/^pse_[A-Za-z0-9_-]{43}$/),
  expiresAt: z.iso.datetime(),
  account: accountSchema,
});
export const connectionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("disconnected"), message: z.string() }),
  z.object({ kind: z.literal("connecting") }),
  z.object({
    kind: z.literal("connected"),
    account: accountSchema,
    expiresAt: z.iso.datetime(),
  }),
]);
export type Connection = z.infer<typeof connectionSchema>;
