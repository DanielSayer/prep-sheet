import { randomUUID } from "node:crypto";
import { db } from "@prep-sheet/db";
import { user } from "@prep-sheet/db/schema/auth";
import { group, groupInvite } from "@prep-sheet/db/schema/group";
import { recipe, recipeFavourite } from "@prep-sheet/db/schema/recipe";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Context } from "../context";
import { appRouter } from "../routers/index";
import { sampleRecipe } from "./fixtures";
import { generateRecipe } from "./generate";

vi.mock("./generate", () => ({ generateRecipe: vi.fn() }));

const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()] as const;
function caller(id: string) {
  const now = new Date();
  const session: Context["session"] = {
    user: {
      id,
      name: "Recipe test",
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
  return appRouter.createCaller({ auth: null, session });
}

describe("recipes API with PostgreSQL", () => {
  beforeAll(async () => {
    await db.insert(user).values(
      ids.map((id) => ({
        id,
        name: "Recipe test",
        email: `${id}@example.test`,
      })),
    );
  });
  afterAll(async () => {
    await db.delete(group).where(inArray(group.ownerId, ids));
    await db.delete(recipe).where(inArray(recipe.userId, ids));
    await db.delete(user).where(inArray(user.id, ids));
    await db.$client.end();
  });
  it("requires authentication", async () => {
    await expect(
      appRouter.createCaller({ auth: null, session: null }).recipes.list(),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("passes available tags to AI, saves valid personal tags, copies them and cascades deletion", async () => {
    const owner = caller(ids[2]);
    const other = caller(ids[3]);
    const defaults = await owner.tags.list();
    expect(defaults).toHaveLength(5);
    const builtIn = defaults[0];
    if (!builtIn) throw new Error("Missing built-in tags");
    const custom = await owner.tags.create({
      name: "Lunchbox",
      description: "Easy to pack",
    });
    await expect(
      owner.tags.create({ name: " lunchBOX " }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await other.tags.list()).some((t) => t.id === custom.id)).toBe(
      false,
    );
    await expect(other.tags.delete({ id: custom.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(owner.tags.delete({ id: builtIn.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const foreign = await other.tags.create({ name: "Private" });
    const id = randomUUID();
    vi.mocked(generateRecipe).mockResolvedValueOnce({
      content: sampleRecipe,
      origin: "generated",
      sourceUrl: null,
      tagIds: [custom.id, foreign.id, randomUUID()],
    });
    await owner.recipes.create({ id, input: "Make lunch" });
    expect(generateRecipe).toHaveBeenLastCalledWith(
      "Make lunch",
      expect.arrayContaining([
        expect.objectContaining({ id: custom.id, description: "Easy to pack" }),
      ]),
    );
    expect((await owner.recipes.get({ id })).tagIds).toEqual([custom.id]);
    expect(
      (await owner.recipes.list()).find((r) => r.id === id)?.tagIds,
    ).toEqual([custom.id]);
    await expect(
      other.recipes.setTag({ id, tagId: foreign.id, selected: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      owner.recipes.setTag({ id, tagId: foreign.id, selected: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await owner.recipes.setTag({ id, tagId: custom.id, selected: false });
    expect((await owner.recipes.get({ id })).tagIds).toEqual([]);
    await owner.recipes.setTag({ id, tagId: custom.id, selected: true });
    await owner.recipes.setTag({ id, tagId: custom.id, selected: true });
    const copied = await owner.recipes.copy({
      id,
      newId: randomUUID(),
      groupId: null,
    });
    expect((await owner.recipes.get(copied)).tagIds).toEqual([custom.id]);
    await owner.tags.delete({ id: custom.id });
    expect((await owner.recipes.get({ id })).tagIds).toEqual([]);
    expect((await owner.recipes.get(copied)).tagIds).toEqual([]);
    await owner.recipes.delete({ id });
    await owner.recipes.delete(copied);
    vi.mocked(generateRecipe).mockClear();
  });
  it("saves JSONB, avoids duplicate saves, isolates users, edits and deletes", async () => {
    const owner = caller(ids[0]);
    const other = caller(ids[1]);
    const id = randomUUID();
    vi.mocked(generateRecipe).mockResolvedValue({
      content: sampleRecipe,
      origin: "generated",
      sourceUrl: null,
      tagIds: [],
    });
    const saved = await owner.recipes.create({ id, input: "Make lemon pasta" });
    expect(saved.content.ingredients).toEqual(sampleRecipe.ingredients);
    await owner.recipes.create({ id, input: "Make lemon pasta" });
    expect(generateRecipe).toHaveBeenCalledTimes(1);
    expect(await owner.recipes.list()).toHaveLength(1);
    expect(await other.recipes.list()).toHaveLength(0);
    await expect(other.recipes.get({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      other.recipes.update({ id, content: sampleRecipe }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(other.recipes.delete({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await owner.recipes.update({
      id,
      content: { ...sampleRecipe, title: "My lemon pasta" },
    });
    expect((await owner.recipes.get({ id })).title).toBe("My lemon pasta");
    await owner.recipes.delete({ id });
    await expect(owner.recipes.get({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("does not save anything when generation fails", async () => {
    vi.mocked(generateRecipe).mockRejectedValueOnce(
      new Error("upstream unavailable"),
    );
    const owner = caller(ids[0]);
    await expect(
      owner.recipes.create({ id: randomUUID(), input: "Make dinner" }),
    ).rejects.toThrow();
    expect(await owner.recipes.list()).toHaveLength(0);
  });

  it("persists personal favourites and rejects inaccessible recipes", async () => {
    const owner = caller(ids[0]);
    const other = caller(ids[1]);
    const id = randomUUID();
    await db.insert(recipe).values({
      id,
      userId: ids[0],
      title: sampleRecipe.title,
      content: sampleRecipe,
      origin: "imported",
    });
    expect((await owner.recipes.get({ id })).isFavourite).toBe(false);
    await expect(
      other.recipes.setFavourite({ id, isFavourite: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await owner.recipes.setFavourite({ id, isFavourite: true });
    await owner.recipes.setFavourite({ id, isFavourite: true });
    expect((await owner.recipes.get({ id })).isFavourite).toBe(true);
    expect(
      (await owner.recipes.list()).find((item) => item.id === id)?.isFavourite,
    ).toBe(true);
    await owner.recipes.setFavourite({ id, isFavourite: false });
    expect((await owner.recipes.get({ id })).isFavourite).toBe(false);
    await owner.recipes.setFavourite({ id, isFavourite: true });
    await owner.recipes.delete({ id });
    expect(
      await db
        .select()
        .from(recipeFavourite)
        .where(eq(recipeFavourite.recipeId, id)),
    ).toHaveLength(0);
  });
  it("validates edits before touching the database", async () => {
    await expect(
      caller(ids[0]).recipes.update({
        id: randomUUID(),
        content: { ...sampleRecipe, steps: [] },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(
      await db.select().from(user).where(eq(user.id, ids[0])),
    ).toHaveLength(1);
  });

  it("shares a group collection while keeping personal and other groups private", async () => {
    vi.mocked(generateRecipe).mockResolvedValue({
      content: sampleRecipe,
      origin: "generated",
      sourceUrl: null,
      tagIds: [],
    });
    const owner = caller(ids[0]);
    const member = caller(ids[1]);
    const outsider = caller(ids[2]);
    const friends = await owner.groups.create({ name: "Dinner friends" });
    const separate = await outsider.groups.create({ name: "Another group" });
    const invitation = await owner.groups.invite({ groupId: friends.id });
    expect(
      await member.groups.previewInvite({ token: invitation.token }),
    ).toEqual({ name: "Dinner friends" });
    await member.groups.acceptInvite({ token: invitation.token });
    await expect(
      outsider.groups.acceptInvite({ token: invitation.token }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await member.groups.list()).toHaveLength(1);
    await expect(
      member.groups.invite({ groupId: friends.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      member.groups.rename({ groupId: friends.id, name: "No" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      member.groups.removeMember({ groupId: friends.id, userId: ids[0] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      owner.groups.removeMember({ groupId: friends.id, userId: ids[0] }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      outsider.groups.details({ groupId: friends.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const personal = await owner.recipes.create({
      id: randomUUID(),
      input: "Personal pasta",
    });
    const shared = await member.recipes.create({
      id: randomUUID(),
      input: "Shared pasta",
      groupId: friends.id,
    });
    expect(await owner.recipes.list({ groupId: friends.id })).toHaveLength(1);
    await member.recipes.setFavourite({ id: shared.id, isFavourite: true });
    const sharedTag = (await member.tags.list())[0];
    if (!sharedTag) throw new Error("Missing default tag");
    await member.recipes.setTag({
      id: shared.id,
      tagId: sharedTag.id,
      selected: true,
    });
    expect((await member.recipes.get({ id: shared.id })).tagIds).toEqual([
      sharedTag.id,
    ]);
    expect((await owner.recipes.get({ id: shared.id })).tagIds).toEqual([]);
    expect((await member.recipes.get({ id: shared.id })).isFavourite).toBe(
      true,
    );
    expect((await owner.recipes.get({ id: shared.id })).isFavourite).toBe(
      false,
    );
    expect(
      (await member.recipes.list({ groupId: friends.id }))[0]?.isFavourite,
    ).toBe(true);
    await expect(
      outsider.recipes.setFavourite({ id: shared.id, isFavourite: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await member.recipes.list()).toHaveLength(0);
    expect(await owner.recipes.list()).toHaveLength(1);
    expect(await outsider.recipes.list({ groupId: separate.id })).toHaveLength(
      0,
    );
    await expect(
      outsider.recipes.list({ groupId: friends.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(member.recipes.get({ id: personal.id })).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
    await expect(outsider.recipes.get({ id: shared.id })).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
    await expect(
      outsider.recipes.update({ id: shared.id, content: sampleRecipe }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      outsider.recipes.delete({ id: shared.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const calls = vi.mocked(generateRecipe).mock.calls.length;
    await expect(
      outsider.recipes.create({
        id: randomUUID(),
        input: "Unauthorised import",
        groupId: friends.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(vi.mocked(generateRecipe).mock.calls.length).toBe(calls);
    await owner.recipes.update({
      id: shared.id,
      content: { ...sampleRecipe, title: "Everyone's pasta" },
    });
    expect((await member.recipes.get({ id: shared.id })).title).toBe(
      "Everyone's pasta",
    );
    const copy = await owner.recipes.copy({
      id: personal.id,
      newId: randomUUID(),
      groupId: friends.id,
    });
    expect((await member.recipes.get({ id: copy.id })).content).toEqual(
      personal.content,
    );
    await expect(
      member.recipes.copy({
        id: shared.id,
        newId: randomUUID(),
        groupId: separate.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await owner.groups.removeMember({ groupId: friends.id, userId: ids[1] });
    await expect(
      member.recipes.setTag({
        id: shared.id,
        tagId: sharedTag.id,
        selected: false,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      member.recipes.setFavourite({ id: shared.id, isFavourite: false }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await member.groups.list()).toHaveLength(0);
    await expect(member.recipes.get({ id: shared.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      member.recipes.update({ id: shared.id, content: sampleRecipe }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      member.recipes.delete({ id: shared.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await owner.recipes.get({ id: shared.id })).id).toBe(shared.id);
    await owner.recipes.delete({ id: shared.id });
    await owner.recipes.delete({ id: personal.id });
  });

  it("expires and revokes invitations and accepts a link only once under concurrency", async () => {
    const owner = caller(ids[0]);
    const target = await owner.groups.create({ name: "Invitation checks" });
    const expired = await owner.groups.invite({ groupId: target.id });
    await db
      .update(groupInvite)
      .set({ expiresAt: new Date(0) })
      .where(eq(groupInvite.groupId, target.id));
    await expect(
      caller(ids[1]).groups.acceptInvite({ token: expired.token }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const revoked = await owner.groups.invite({ groupId: target.id });
    const detail = await owner.groups.details({ groupId: target.id });
    const inviteId = detail.invites[0]?.id;
    if (!inviteId) throw new Error("Missing invite");
    await owner.groups.revokeInvite({ groupId: target.id, inviteId });
    await expect(
      caller(ids[1]).groups.acceptInvite({ token: revoked.token }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const concurrent = await owner.groups.invite({ groupId: target.id });
    const results = await Promise.allSettled([
      caller(ids[1]).groups.acceptInvite({ token: concurrent.token }),
      caller(ids[2]).groups.acceptInvite({ token: concurrent.token }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      (await owner.groups.details({ groupId: target.id })).members,
    ).toHaveLength(2);
    const members = (await owner.groups.details({ groupId: target.id }))
      .members;
    const joined = members.find((member) => member.id !== ids[0]);
    if (!joined) throw new Error("Missing member");
    await caller(joined.id).groups.removeMember({
      groupId: target.id,
      userId: joined.id,
    });
    expect(
      (await owner.groups.details({ groupId: target.id })).members,
    ).toHaveLength(1);
  });

  it("rechecks membership after generation and keeps contributions when an account is deleted", async () => {
    const owner = caller(ids[0]);
    const member = caller(ids[3]);
    const target = await owner.groups.create({ name: "Membership checks" });
    const invite = await owner.groups.invite({ groupId: target.id });
    await member.groups.acceptInvite({ token: invite.token });
    vi.mocked(generateRecipe).mockResolvedValue({
      content: sampleRecipe,
      origin: "generated",
      sourceUrl: null,
      tagIds: [],
    });
    const saved = await member.recipes.create({
      id: randomUUID(),
      input: "Keep this recipe",
      groupId: target.id,
    });
    vi.mocked(generateRecipe).mockImplementationOnce(async () => {
      await owner.groups.removeMember({ groupId: target.id, userId: ids[3] });
      return {
        content: sampleRecipe,
        origin: "generated",
        sourceUrl: null,
        tagIds: [],
      };
    });
    await expect(
      member.recipes.create({
        id: randomUUID(),
        input: "Removed during generation",
        groupId: target.id,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await owner.recipes.list({ groupId: target.id })).toHaveLength(1);
    await db.delete(user).where(eq(user.id, ids[3]));
    expect((await owner.recipes.get({ id: saved.id })).userId).toBeNull();
  });

  it("transfers ownership and deletes only the chosen group's recipes", async () => {
    const owner = caller(ids[0]);
    const member = caller(ids[1]);
    const target = await owner.groups.create({ name: "Group lifecycle" });
    const invite = await owner.groups.invite({ groupId: target.id });
    await member.groups.acceptInvite({ token: invite.token });
    await owner.groups.rename({ groupId: target.id, name: "Renamed group" });
    expect((await member.groups.details({ groupId: target.id })).name).toBe(
      "Renamed group",
    );
    await expect(
      member.groups.delete({ groupId: target.id, name: "Renamed group" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      member.groups.transferOwnership({ groupId: target.id, userId: ids[1] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      owner.groups.transferOwnership({ groupId: target.id, userId: ids[2] }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await owner.groups.transferOwnership({
      groupId: target.id,
      userId: ids[1],
    });
    await expect(
      owner.groups.invite({ groupId: target.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await owner.groups.removeMember({ groupId: target.id, userId: ids[0] });
    await expect(
      owner.groups.details({ groupId: target.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    vi.mocked(generateRecipe).mockResolvedValue({
      content: sampleRecipe,
      origin: "generated",
      sourceUrl: null,
      tagIds: [],
    });
    const shared = await member.recipes.create({
      id: randomUUID(),
      input: "Shared fixture",
      groupId: target.id,
    });
    const personal = await member.recipes.copy({
      id: shared.id,
      newId: randomUUID(),
      groupId: null,
    });
    await expect(
      member.groups.delete({ groupId: target.id, name: "Wrong name" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await member.groups.delete({ groupId: target.id, name: "Renamed group" });
    await expect(member.recipes.get({ id: shared.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await member.recipes.get({ id: personal.id })).title).toBe(
      sampleRecipe.title,
    );
    await member.recipes.delete({ id: personal.id });
  });
});
