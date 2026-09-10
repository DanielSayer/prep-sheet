import {
  collectionsSchema,
  importInputSchema,
} from "@prep-sheet/api/import-contract";
import { z } from "zod";

export const pendingSchema = importInputSchema.extend({
  title: z.string().max(300).optional(),
  collectionName: z.string().optional(),
});
export const destinationSchema = z.object({
  collections: collectionsSchema,
  groupId: z.uuid().nullable(),
  changed: z.boolean(),
});
export const responseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
    reconnect: z.boolean().optional(),
  }),
]);

export class PopupError extends Error {
  constructor(
    message: string,
    readonly reconnect = false,
  ) {
    super(message);
  }
}
