import { randomUUID } from "node:crypto";
import { db } from "@prep-sheet/db";
import { user } from "@prep-sheet/db/schema/auth";
import { group, groupMember } from "@prep-sheet/db/schema/group";
import { recipe } from "@prep-sheet/db/schema/recipe";
import { accountDeletionRequest } from "@prep-sheet/db/schema/support";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { completeAccountDeletion } from "./account-deletion";
import type { Context } from "./context";
import { sampleRecipe } from "./recipes/fixtures";
import { appRouter } from "./routers";

const ownerId = randomUUID();
const otherId = randomUUID();
const groupId = randomUUID();
const personalId = randomUUID();
const sharedId = randomUUID();
function caller(id: string) {
  const now = new Date();
  const session: Context["session"] = {
    user: {
      id,
      name: "Shopping test",
      email: `${id}@example.test`,
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: randomUUID(),
      token: randomUUID(),
      userId: id,
      expiresAt: new Date(Date.now() + 60000),
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: null,
    },
  };
  return appRouter.createCaller({ auth: null, session }).support;
}

const owner = caller(ownerId);
const other = caller(otherId);
describe("account support with PostgreSQL", () => {
  beforeAll(async () => {
    await db.insert(user).values(
      [ownerId, otherId].map((id) => ({
        id,
        name: "Support test",
        email: `${id}@example.test`,
      })),
    );
    await db
      .insert(group)
      .values({ id: groupId, ownerId, name: "Support test group" });
    await db.insert(groupMember).values([
      { groupId, userId: ownerId },
      { groupId, userId: otherId },
    ]);
    await db.insert(recipe).values([
      {
        id: personalId,
        userId: ownerId,
        title: "Personal",
        origin: "manual",
        content: sampleRecipe,
      },
      {
        id: sharedId,
        userId: ownerId,
        groupId,
        title: "Shared",
        origin: "manual",
        content: sampleRecipe,
      },
    ]);
  });
  afterAll(async () => {
    await db.delete(group).where(eq(group.id, groupId));
    await db.delete(recipe).where(eq(recipe.id, personalId));
    await db.delete(user).where(inArray(user.id, [ownerId, otherId]));
    await db.$client.end();
  });
  it("requires authentication and keeps reports private", async () => {
    await expect(
      appRouter.createCaller({ auth: null, session: null }).support.reports(),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(owner.report({ message: " " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await owner.report({ message: "The recipe page failed to load." });
    expect(await owner.reports()).toHaveLength(1);
    expect(await other.reports()).toHaveLength(0);
  });
  it("limits concurrent reports to five per hour", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        owner.report({ message: "A concurrent test report." }),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(4);
    expect(await owner.reports()).toHaveLength(5);
  });
  it("deduplicates deletion requests and only cancels your own", async () => {
    await Promise.all([
      owner.requestDeletion({ confirmation: "DELETE" }),
      owner.requestDeletion({ confirmation: "DELETE" }),
    ]);
    expect(
      await db
        .select()
        .from(accountDeletionRequest)
        .where(eq(accountDeletionRequest.userId, ownerId)),
    ).toHaveLength(1);
    await other.cancelDeletion();
    const current = await owner.deletion();
    expect(current.ownedGroups).toHaveLength(1);
    expect(current.request).not.toBeNull();
    await owner.cancelDeletion();
    expect((await owner.deletion()).request).toBeNull();
    if (!current.request) throw new Error("Missing request");
    await expect(completeAccountDeletion(current.request.id)).rejects.toThrow(
      "No pending",
    );
  });
  it("blocks group owners, then removes private data while preserving shared contributions", async () => {
    await owner.requestDeletion({ confirmation: "DELETE" });
    const { request } = await owner.deletion();
    if (!request) throw new Error("Missing request");
    await expect(completeAccountDeletion(request.id)).rejects.toThrow(
      "still owns groups",
    );
    expect(
      await db.select().from(recipe).where(eq(recipe.id, personalId)),
    ).toHaveLength(1);
    await db
      .update(group)
      .set({ ownerId: otherId })
      .where(eq(group.id, groupId));
    await completeAccountDeletion(request.id);
    expect(
      await db.select().from(user).where(eq(user.id, ownerId)),
    ).toHaveLength(0);
    expect(
      await db.select().from(recipe).where(eq(recipe.id, personalId)),
    ).toHaveLength(0);
    const [shared] = await db
      .select()
      .from(recipe)
      .where(eq(recipe.id, sharedId));
    expect(shared?.userId).toBeNull();
    expect(shared?.groupId).toBe(groupId);
    await expect(completeAccountDeletion(request.id)).rejects.toThrow(
      "No pending",
    );
  });
});
