import { randomUUID } from "node:crypto";
import { db } from "@prep-sheet/db";
import { user } from "@prep-sheet/db/schema/auth";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Context } from "../context";
import { appRouter } from "../routers/index";
import { sampleRecipe } from "./fixtures";
import { generateRecipe } from "./generate";

vi.mock("./generate", () => ({ generateRecipe: vi.fn() }));

const ids = [randomUUID(), randomUUID()] as const;
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
    await db.delete(user).where(inArray(user.id, ids));
    await db.$client.end();
  });
  it("requires authentication", async () => {
    await expect(
      appRouter.createCaller({ auth: null, session: null }).recipes.list(),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("saves JSONB, avoids duplicate saves, isolates users, edits and deletes", async () => {
    const owner = caller(ids[0]);
    const other = caller(ids[1]);
    const id = randomUUID();
    vi.mocked(generateRecipe).mockResolvedValue({
      content: sampleRecipe,
      origin: "generated",
      sourceUrl: null,
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
});
