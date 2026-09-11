import { randomUUID } from "node:crypto";
import { db } from "@prep-sheet/db";
import { tag } from "@prep-sheet/db/schema/tag";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";

const tagDetailsInput = z.object({
  name: z.string().trim().min(1).max(40),
  description: z.string().trim().max(300).default(""),
});

const defaults = (
  [
    [
      "High protein",
      "A substantial protein source per serving, such as meat, fish, eggs, tofu or legumes. Do not invent nutrition figures.",
    ],
    [
      "Under 30 minutes",
      "Total elapsed time is strictly less than 30 minutes, including preparation, cooking and any waiting. Skip if total time is unknown.",
    ],
    [
      "Under an hour",
      "Total elapsed time is strictly less than 60 minutes, including preparation, cooking and any waiting. Skip if total time is unknown.",
    ],
    [
      "Vegetarian",
      "No meat, fish, seafood, meat stock or gelatine. Check all ingredients.",
    ],
    [
      "Freezer friendly",
      "The finished dish can reasonably be frozen and reheated without losing its intended texture.",
    ],
  ] as const
).map(([name, description], index) => ({
  id: `00000000-0000-4000-8000-00000000000${index + 1}`,
  name,
  description,
}));

export async function availableTags(userId: string) {
  await db.insert(tag).values(defaults).onConflictDoNothing();
  return db
    .select()
    .from(tag)
    .where(or(isNull(tag.userId), eq(tag.userId, userId)))
    .orderBy(asc(tag.name));
}

export const tagsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    availableTags(ctx.session.user.id),
  ),
  create: protectedProcedure
    .input(tagDetailsInput)
    .mutation(async ({ ctx, input }) => {
      const available = await availableTags(ctx.session.user.id);
      if (
        available.some((t) => t.name.toLowerCase() === input.name.toLowerCase())
      )
        throw new TRPCError({
          code: "CONFLICT",
          message: "A tag with that name already exists.",
        });
      if (available.length >= 105)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can create up to 100 custom tags.",
        });
      const [saved] = await db
        .insert(tag)
        .values({ id: randomUUID(), userId: ctx.session.user.id, ...input })
        .onConflictDoNothing()
        .returning();
      if (!saved)
        throw new TRPCError({
          code: "CONFLICT",
          message: "A tag with that name already exists.",
        });
      return saved;
    }),
  update: protectedProcedure
    .input(tagDetailsInput.extend({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const available = await availableTags(ctx.session.user.id);
      if (
        available.some(
          (candidate) =>
            candidate.id !== input.id &&
            candidate.name.toLowerCase() === input.name.toLowerCase(),
        )
      )
        throw new TRPCError({
          code: "CONFLICT",
          message: "A tag with that name already exists.",
        });
      const [saved] = await db
        .update(tag)
        .set({ name: input.name, description: input.description })
        .where(and(eq(tag.id, input.id), eq(tag.userId, ctx.session.user.id)))
        .returning();
      if (!saved)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom tag not found.",
        });
      return saved;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await db
        .delete(tag)
        .where(and(eq(tag.id, input.id), eq(tag.userId, ctx.session.user.id)))
        .returning();
      if (!deleted.length)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom tag not found.",
        });
      return { success: true };
    }),
});
