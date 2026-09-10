import { createHash } from "node:crypto";
import { db } from "@prep-sheet/db";
import { user } from "@prep-sheet/db/schema/auth";
import { group, groupMember } from "@prep-sheet/db/schema/group";
import { recipeImport } from "@prep-sheet/db/schema/import";
import { recipe } from "@prep-sheet/db/schema/recipe";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, gte, lt } from "drizzle-orm";
import type { z } from "zod";
import { lockGroup, requireGroup } from "./groups/access";
import { type ImportStatus, importInputSchema } from "./import-contract";
import { generateRecipe } from "./recipes/generate";
import { persistRecipe } from "./recipes/persist";
import { checkRecipeUsage } from "./recipes/usage";
import { availableTags } from "./routers/tags";

export async function importCollections(userId: string) {
  const groups = await db
    .select({ id: group.id, name: group.name })
    .from(group)
    .innerJoin(groupMember, eq(groupMember.groupId, group.id))
    .where(eq(groupMember.userId, userId))
    .orderBy(asc(group.name));
  return [{ id: null, name: "My recipes" }, ...groups];
}

export async function importStatus(
  userId: string,
  id: string,
): Promise<ImportStatus> {
  const [job] = await db
    .select()
    .from(recipeImport)
    .where(and(eq(recipeImport.id, id), eq(recipeImport.userId, userId)));
  if (!job)
    throw new TRPCError({ code: "NOT_FOUND", message: "Import not found." });
  switch (job.state) {
    case "queued":
      return { kind: "queued", id };
    case "processing":
    case "ready":
      return { kind: "processing", id };
    case "failed":
      return {
        kind: "failed",
        id,
        message:
          job.error ??
          "Import failed. Capture the recipe again to start a new attempt.",
      };
    case "saved": {
      // A recovered link must not expose a recipe after membership loss or deletion.
      if (job.groupId) await requireGroup(db, job.groupId, userId);
      const [saved] = await db
        .select({ title: recipe.title })
        .from(recipe)
        .where(and(eq(recipe.id, id), eq(recipe.userId, userId)));
      if (!saved)
        return {
          kind: "failed",
          id,
          message: "The saved recipe has been deleted.",
        };
      return { kind: "saved", id, recipeId: id, title: saved.title };
    }
  }
}

function fingerprintOf(input: z.infer<typeof importInputSchema>) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        content: input.content,
        sourceUrl: input.sourceUrl,
        groupId: input.groupId,
      }),
    )
    .digest("hex");
}

export async function discardImport(userId: string, value: unknown) {
  const input = importInputSchema.parse(value);
  const fingerprint = fingerprintOf(input);
  await db.transaction(async (tx) => {
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .for("update");
    const [existing] = await tx
      .select()
      .from(recipeImport)
      .where(eq(recipeImport.id, input.id));
    if (existing) {
      if (existing.userId !== userId || existing.fingerprint !== fingerprint)
        throw new TRPCError({
          code: "CONFLICT",
          message: "This import ID has already been used.",
        });
      if (existing.state !== "saved" && existing.state !== "failed")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Your import is still processing. Check it again shortly.",
        });
      return;
    }
    await checkRecipeUsage(tx, userId);
    // A durable tombstone prevents a delayed submission from being accepted after reset.
    await tx.insert(recipeImport).values({
      id: input.id,
      userId,
      groupId: input.groupId,
      fingerprint,
      sourceUrl: input.sourceUrl,
      input: "",
      state: "failed",
      error:
        "This import was discarded. Start another import to save the recipe.",
    });
  });
}

export async function submitImport(userId: string, value: unknown) {
  const input = importInputSchema.parse(value);
  const fingerprint = fingerprintOf(input);
  await db.transaction(async (tx) => {
    // Serialize admissions and retries per account before checking the job or quota.
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .for("update");
    const [existing] = await tx
      .select()
      .from(recipeImport)
      .where(eq(recipeImport.id, input.id));
    if (existing) {
      if (existing.userId !== userId || existing.fingerprint !== fingerprint)
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This import ID has already been used. Recover the original import or capture again.",
        });
      return;
    }
    if (input.groupId) await requireGroup(tx, input.groupId, userId);
    await checkRecipeUsage(tx, userId);
    const [recent] = await tx
      .select({ total: count() })
      .from(recipeImport)
      .where(
        and(
          eq(recipeImport.userId, userId),
          gte(recipeImport.createdAt, new Date(Date.now() - 60_000)),
        ),
      );
    if ((recent?.total ?? 0) >= 5)
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Please wait a minute before starting another import.",
      });
    const [collision] = await tx
      .select({ id: recipe.id })
      .from(recipe)
      .where(eq(recipe.id, input.id));
    if (collision)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This recipe ID is already in use.",
      });
    await tx.insert(recipeImport).values({
      id: input.id,
      userId,
      groupId: input.groupId,
      input: input.content,
      sourceUrl: input.sourceUrl,
      fingerprint,
    });
  });
  return importStatus(userId, input.id);
}

// A dedicated process awaits this function. No work is launched by HTTP handlers.
export async function processNextImport(generate = generateRecipe) {
  const [ready] = await db
    .select({ id: recipeImport.id })
    .from(recipeImport)
    .where(eq(recipeImport.state, "ready"))
    .limit(1);
  if (ready) {
    await saveReady(ready.id);
    return true;
  }
  // Do not replay an AI call whose outcome was lost with its worker. Keep the ID terminal.
  await db
    .update(recipeImport)
    .set({
      state: "failed",
      input: "",
      error:
        "Processing was interrupted. Capture again to start a new attempt; this import will not run twice.",
    })
    .where(
      and(
        eq(recipeImport.state, "processing"),
        lt(recipeImport.startedAt, new Date(Date.now() - 180_000)),
      ),
    );
  const job = await db.transaction(async (tx) => {
    const [next] = await tx
      .select()
      .from(recipeImport)
      .where(eq(recipeImport.state, "queued"))
      .orderBy(asc(recipeImport.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!next) return null;
    await tx
      .update(recipeImport)
      .set({ state: "processing", startedAt: new Date() })
      .where(eq(recipeImport.id, next.id));
    return next;
  });
  if (!job) return false;
  try {
    if (job.groupId) await requireGroup(db, job.groupId, job.userId);
    const result = await generate(
      job.input,
      await availableTags(job.userId),
      job.sourceUrl,
    );
    // Checkpoint the expensive result before the save transaction. A restart can finish saving.
    await db
      .update(recipeImport)
      .set({
        state: "ready",
        input: "",
        generated: { content: result.content, tagIds: result.tagIds },
      })
      .where(
        and(eq(recipeImport.id, job.id), eq(recipeImport.state, "processing")),
      );
  } catch (error) {
    await failImport(job.id, error);
    return true;
  }
  await saveReady(job.id);
  return true;
}

async function failImport(id: string, error: unknown) {
  await db
    .update(recipeImport)
    .set({
      state: "failed",
      input: "",
      error:
        error instanceof TRPCError
          ? error.message
          : "Processing failed. Capture again to start a new attempt.",
    })
    .where(and(eq(recipeImport.id, id), eq(recipeImport.state, "processing")));
}

async function saveReady(id: string) {
  await db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(recipeImport)
      .where(and(eq(recipeImport.id, id), eq(recipeImport.state, "ready")))
      .for("update");
    if (!job?.generated) return;
    // Serialize usage conversion with admissions and website saves.
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, job.userId))
      .for("update");
    if (job.groupId) {
      await lockGroup(tx, job.groupId);
      try {
        await requireGroup(tx, job.groupId, job.userId);
      } catch {
        await tx
          .update(recipeImport)
          .set({
            state: "failed",
            generated: null,
            error:
              "Group access changed. Capture again and choose a collection you can write to.",
          })
          .where(eq(recipeImport.id, id));
        return;
      }
    }
    const [existing] = await tx
      .select({ id: recipe.id })
      .from(recipe)
      .where(eq(recipe.id, id));
    if (existing) {
      await tx
        .update(recipeImport)
        .set({
          state: "failed",
          generated: null,
          error: "This recipe ID is already in use. Start another import.",
        })
        .where(eq(recipeImport.id, id));
      return;
    }
    const inserted = await persistRecipe(
      tx,
      {
        id,
        userId: job.userId,
        groupId: job.groupId,
        title: job.generated.content.title,
        content: job.generated.content,
        sourceUrl: job.sourceUrl,
        origin: "imported",
      },
      job.generated.tagIds,
    );
    await tx
      .update(recipeImport)
      .set({
        state: inserted ? "saved" : "failed",
        generated: null,
        error: inserted
          ? null
          : "This recipe ID is already in use. Start another import.",
      })
      .where(eq(recipeImport.id, id));
  });
}
