import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "@prep-sheet/db";
import { user } from "@prep-sheet/db/schema/auth";
import { group, groupInvite, groupMember } from "@prep-sheet/db/schema/group";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { lockGroup, requireGroup } from "../groups/access";
import { protectedProcedure, router } from "../index";

const groupInput = z.object({ groupId: z.uuid() });
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const tokenInput = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
const liveInvite = (token: string) =>
  and(
    eq(groupInvite.tokenHash, hash(token)),
    isNull(groupInvite.revokedAt),
    isNull(groupInvite.acceptedAt),
    gt(groupInvite.expiresAt, new Date()),
  );
const invalidInvite = () =>
  new TRPCError({
    code: "NOT_FOUND",
    message:
      "This invitation has expired, was revoked or has already been used. Ask for a new link.",
  });

export const groupsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    db
      .select({ id: group.id, name: group.name, ownerId: group.ownerId })
      .from(group)
      .innerJoin(groupMember, eq(groupMember.groupId, group.id))
      .where(eq(groupMember.userId, ctx.session.user.id))
      .orderBy(asc(group.createdAt)),
  ),
  create: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1).max(80) }))
    .mutation(({ input, ctx }) =>
      db.transaction(async (tx) => {
        const [created] = await tx
          .insert(group)
          .values({
            id: randomUUID(),
            name: input.name,
            ownerId: ctx.session.user.id,
          })
          .returning();
        if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await tx
          .insert(groupMember)
          .values({ groupId: created.id, userId: ctx.session.user.id });
        return created;
      }),
    ),
  details: protectedProcedure
    .input(groupInput)
    .query(async ({ input, ctx }) => {
      const group = await requireGroup(db, input.groupId, ctx.session.user.id);
      const members = await db
        .select({ id: user.id, name: user.name })
        .from(groupMember)
        .innerJoin(user, eq(user.id, groupMember.userId))
        .where(eq(groupMember.groupId, group.id))
        .orderBy(asc(groupMember.joinedAt));
      const invites =
        group.ownerId === ctx.session.user.id
          ? await db
              .select({ id: groupInvite.id, expiresAt: groupInvite.expiresAt })
              .from(groupInvite)
              .where(
                and(
                  eq(groupInvite.groupId, group.id),
                  isNull(groupInvite.acceptedAt),
                  isNull(groupInvite.revokedAt),
                  gt(groupInvite.expiresAt, new Date()),
                ),
              )
          : [];
      return { ...group, members, invites };
    }),
  rename: protectedProcedure
    .input(groupInput.extend({ name: z.string().trim().min(1).max(80) }))
    .mutation(({ input, ctx }) =>
      db.transaction(async (tx) => {
        await lockGroup(tx, input.groupId);
        await requireGroup(tx, input.groupId, ctx.session.user.id, true);
        await tx
          .update(group)
          .set({ name: input.name })
          .where(eq(group.id, input.groupId));
        return { success: true };
      }),
    ),
  invite: protectedProcedure.input(groupInput).mutation(({ input, ctx }) =>
    db.transaction(async (tx) => {
      await lockGroup(tx, input.groupId);
      await requireGroup(tx, input.groupId, ctx.session.user.id, true);
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 86400000);
      await tx.insert(groupInvite).values({
        id: randomUUID(),
        groupId: input.groupId,
        tokenHash: hash(token),
        expiresAt,
      });
      return { token, expiresAt };
    }),
  ),
  revokeInvite: protectedProcedure
    .input(groupInput.extend({ inviteId: z.uuid() }))
    .mutation(({ input, ctx }) =>
      db.transaction(async (tx) => {
        await lockGroup(tx, input.groupId);
        await requireGroup(tx, input.groupId, ctx.session.user.id, true);
        await tx
          .update(groupInvite)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(groupInvite.id, input.inviteId),
              eq(groupInvite.groupId, input.groupId),
            ),
          );
        return { success: true };
      }),
    ),
  previewInvite: protectedProcedure
    .input(tokenInput)
    .query(async ({ input }) => {
      const [invite] = await db
        .select({ name: group.name })
        .from(groupInvite)
        .innerJoin(group, eq(group.id, groupInvite.groupId))
        .where(liveInvite(input.token));
      if (!invite) throw invalidInvite();
      return invite;
    }),
  acceptInvite: protectedProcedure
    .input(tokenInput)
    .mutation(({ input, ctx }) =>
      db.transaction(async (tx) => {
        const [candidate] = await tx
          .select()
          .from(groupInvite)
          .where(liveInvite(input.token));
        if (!candidate) throw invalidInvite();
        await lockGroup(tx, candidate.groupId);
        const [invite] = await tx
          .select()
          .from(groupInvite)
          .where(liveInvite(input.token));
        if (!invite) throw invalidInvite();
        const [existing] = await tx
          .select()
          .from(groupMember)
          .where(
            and(
              eq(groupMember.groupId, invite.groupId),
              eq(groupMember.userId, ctx.session.user.id),
            ),
          );
        if (existing) return { groupId: invite.groupId };
        await tx
          .insert(groupMember)
          .values({ groupId: invite.groupId, userId: ctx.session.user.id });
        await tx
          .update(groupInvite)
          .set({ acceptedAt: new Date() })
          .where(eq(groupInvite.id, invite.id));
        return { groupId: invite.groupId };
      }),
    ),
  removeMember: protectedProcedure
    .input(groupInput.extend({ userId: z.string().min(1) }))
    .mutation(({ input, ctx }) =>
      db.transaction(async (tx) => {
        await lockGroup(tx, input.groupId);
        const group = await requireGroup(
          tx,
          input.groupId,
          ctx.session.user.id,
          input.userId !== ctx.session.user.id,
        );
        if (input.userId === group.ownerId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The owner must stay in the group.",
          });
        await tx
          .delete(groupMember)
          .where(
            and(
              eq(groupMember.groupId, input.groupId),
              eq(groupMember.userId, input.userId),
            ),
          );
        return { success: true };
      }),
    ),
  transferOwnership: protectedProcedure
    .input(groupInput.extend({ userId: z.string().min(1) }))
    .mutation(({ input, ctx }) =>
      db.transaction(async (tx) => {
        await lockGroup(tx, input.groupId);
        await requireGroup(tx, input.groupId, ctx.session.user.id, true);
        const [member] = await tx
          .select()
          .from(groupMember)
          .where(
            and(
              eq(groupMember.groupId, input.groupId),
              eq(groupMember.userId, input.userId),
            ),
          );
        if (!member)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose someone who is already a member.",
          });
        await tx
          .update(group)
          .set({ ownerId: input.userId })
          .where(eq(group.id, input.groupId));
        return { success: true };
      }),
    ),
  delete: protectedProcedure
    .input(groupInput.extend({ name: z.string() }))
    .mutation(({ input, ctx }) =>
      db.transaction(async (tx) => {
        await lockGroup(tx, input.groupId);
        const current = await requireGroup(
          tx,
          input.groupId,
          ctx.session.user.id,
          true,
        );
        if (input.name !== current.name)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enter the group name exactly to confirm deletion.",
          });
        await tx.delete(group).where(eq(group.id, input.groupId));
        return { success: true };
      }),
    ),
});
