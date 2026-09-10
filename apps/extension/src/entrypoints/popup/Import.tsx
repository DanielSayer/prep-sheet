import {
  collectionsSchema,
  type ImportStatus,
  importStatusSchema,
} from "@prep-sheet/api/import-contract";
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { z } from "zod";
import { prepSheetOrigin } from "../../lib/config";

const responseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);
async function send(command: unknown) {
  const response = responseSchema.parse(
    await browser.runtime.sendMessage(command),
  );
  if (!response.ok) throw new Error(response.error);
  return response.data;
}

export function Import({
  content,
  sourceUrl,
}: {
  content?: string;
  sourceUrl?: string;
}) {
  const [collections, setCollections] = useState<
    z.infer<typeof collectionsSchema>
  >([]);
  const [groupId, setGroupId] = useState("");
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const recover = useCallback(async () => {
    try {
      setStatus(
        importStatusSchema
          .nullable()
          .parse(await send({ kind: "recover-import" })),
      );
      setError("");
      setLoaded(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Couldn't recover your import.",
      );
    }
  }, []);
  useEffect(() => {
    void send({ kind: "collections" })
      .then((value) => setCollections(collectionsSchema.parse(value)))
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Couldn't load collections.",
        ),
      );
    void recover();
  }, [recover]);
  const pending = status?.kind === "queued" || status?.kind === "processing";
  useEffect(() => {
    if ((status?.kind !== "queued" && status?.kind !== "processing") || error)
      return;
    const timer = setTimeout(() => void recover(), 3000);
    return () => clearTimeout(timer);
  }, [status, error, recover]);
  async function save() {
    setBusy(true);
    setError("");
    try {
      setStatus(
        importStatusSchema.parse(
          await send({
            kind: "save-import",
            input: { content, sourceUrl, groupId: groupId || null },
          }),
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn't save. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    try {
      await send({ kind: "reset-import" });
      setStatus(null);
      setError("");
      setLoaded(true);
      setCollections(
        collectionsSchema.parse(await send({ kind: "collections" })),
      );
      setGroupId("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Couldn't reset. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="import">
      {content && status === null && (
        <>
          <fieldset disabled={busy || !loaded}>
            <legend>Save to</legend>
            {collections.map((collection) => (
              <label
                className="recipe-choice"
                key={collection.id ?? "personal"}
              >
                <input
                  type="radio"
                  name="collection"
                  checked={groupId === (collection.id ?? "")}
                  onChange={() => setGroupId(collection.id ?? "")}
                />
                <span>{collection.name}</span>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            disabled={busy || !loaded || !collections.length}
            onClick={() => void save()}
          >
            {busy ? "Submitting..." : "Save recipe"}
          </button>
        </>
      )}
      {pending && (
        <p className="capture-note" role="status">
          {status.kind === "queued"
            ? "Waiting to process your recipe."
            : "Processing your recipe."}{" "}
          You can close this popup and return later.
        </p>
      )}
      {status?.kind === "saved" && (
        <a
          className="saved"
          href={`${prepSheetOrigin}/recipes/${status.recipeId}`}
          target="_blank"
          rel="noreferrer"
        >
          Open {status.title} <span aria-hidden="true">↗</span>
        </a>
      )}
      {status?.kind === "failed" && (
        <p className="error" role="alert">
          {status.message}
        </p>
      )}
      {(status?.kind === "failed" || status?.kind === "saved" || error) && (
        <button
          className="secondary"
          type="button"
          disabled={busy}
          onClick={() => void reset()}
        >
          Start another import
        </button>
      )}
      {error && (
        <>
          <p className="error" role="alert">
            {error}
          </p>
          <button
            className="secondary"
            type="button"
            onClick={() => void recover()}
          >
            Check import again
          </button>
        </>
      )}
    </div>
  );
}
