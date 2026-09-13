import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ErrorNotice } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";

const draftSchema = z.object({
  entryId: z.uuid(),
  cookedOn: z.string(),
  note: z.string(),
});
type Draft = z.infer<typeof draftSchema>;

function readDraft(key: string): Draft | null {
  try {
    return (
      draftSchema.safeParse(JSON.parse(localStorage.getItem(key) ?? "null"))
        .data ?? null
    );
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function CookingHistory({ id, userId }: { id: string; userId: string }) {
  const trpc = useTRPC();
  const client = useQueryClient();
  const key = `prep-sheet:cooking:${userId}:${id}`;
  const [draft, setDraft] = useState<Draft | null>(() => readDraft(key));
  const [storageError, setStorageError] = useState<string>();
  const [deleting, setDeleting] = useState<string | null>(null);
  const history = useQuery(trpc.recipes.cookingHistory.queryOptions({ id }));
  useEffect(() => {
    try {
      if (draft) localStorage.setItem(key, JSON.stringify(draft));
      else localStorage.removeItem(key);
      setStorageError(undefined);
    } catch {
      setStorageError(
        "Your draft cannot be kept on this device. Keep this page open until you save.",
      );
    }
  }, [draft, key]);
  const refresh = () =>
    client.invalidateQueries({ queryKey: trpc.recipes.pathKey() });
  const save = useMutation(
    trpc.recipes.saveCooking.mutationOptions({
      onSuccess: async () => {
        setDraft(null);
        await refresh();
      },
    }),
  );
  const remove = useMutation(
    trpc.recipes.deleteCooking.mutationOptions({
      onSuccess: async () => {
        setDeleting(null);
        await refresh();
      },
    }),
  );
  return (
    <section className="cooking-history" aria-label="Your cooking history">
      <div className="cooking-history-heading">
        <div>
          <h2>Cooking history</h2>
          <p className="muted">Only you can see these dates and notes.</p>
        </div>
        {!draft && (
          <button
            type="button"
            className="button button-small button-outline"
            disabled={save.isPending || remove.isPending}
            onClick={() => {
              save.reset();
              setDraft({
                entryId: crypto.randomUUID(),
                cookedOn: today(),
                note: "",
              });
            }}
          >
            Cooked this
          </button>
        )}
      </div>
      {draft && (
        <form
          className="cooking-entry-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!save.isPending)
              save.mutate({ id, ...draft, cookedOn: draft.cookedOn || null });
          }}
        >
          <label>
            Date <span className="muted">Optional</span>
            <input
              type="date"
              value={draft.cookedOn}
              disabled={save.isPending}
              onChange={(event) =>
                setDraft({ ...draft, cookedOn: event.target.value })
              }
            />
          </label>
          <label>
            Private note <span className="muted">Optional</span>
            <textarea
              rows={3}
              maxLength={5000}
              value={draft.note}
              placeholder="What did you change? What would you do next time?"
              disabled={save.isPending}
              onChange={(event) =>
                setDraft({ ...draft, note: event.target.value })
              }
            />
          </label>
          <ErrorNotice message={save.error?.message ?? storageError} />
          <div className="cooking-entry-actions">
            <button
              type="submit"
              className="button button-small button-primary"
              disabled={save.isPending}
            >
              {save.isPending ? "Saving..." : "Save entry"}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={save.isPending}
              onClick={() => {
                setDraft(null);
                save.reset();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <ErrorNotice
        message={history.error?.message}
        retry={() => void history.refetch()}
      />
      <ErrorNotice message={remove.error?.message} />
      {history.isPending && <p role="status">Loading cooking history...</p>}
      {history.isSuccess && history.data.length === 0 && (
        <p className="muted">No cooks recorded yet.</p>
      )}
      {!!history.data?.length && (
        <details>
          <summary>
            {history.data.length} {history.data.length === 1 ? "cook" : "cooks"}{" "}
            recorded
            {history.data[0]?.cookedOn
              ? ` · Last cooked ${formatDate(history.data[0].cookedOn)}`
              : " · Date not recorded"}
          </summary>
          <ul className="cooking-entries">
            {history.data.map((entry) => (
              <li key={entry.id}>
                <strong>
                  {entry.cookedOn ? (
                    <time dateTime={entry.cookedOn}>
                      {formatDate(entry.cookedOn)}
                    </time>
                  ) : (
                    "Date not recorded"
                  )}
                </strong>
                {entry.note && <p>{entry.note}</p>}
                <div className="cooking-entry-actions">
                  {deleting === entry.id ? (
                    <>
                      <span>Delete this entry?</span>
                      <button
                        type="button"
                        className="text-button"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate({ id, entryId: entry.id })}
                      >
                        {remove.isPending ? "Deleting..." : "Delete"}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={remove.isPending}
                        onClick={() => setDeleting(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="text-button"
                        disabled={!!draft || remove.isPending}
                        aria-label={`Edit cooking entry ${entry.cookedOn ?? "without a date"}`}
                        onClick={() => {
                          save.reset();
                          setDraft({
                            entryId: entry.id,
                            cookedOn: entry.cookedOn ?? "",
                            note: entry.note,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={!!draft || remove.isPending}
                        aria-label={`Delete cooking entry ${entry.cookedOn ?? "without a date"}`}
                        onClick={() => {
                          remove.reset();
                          setDeleting(entry.id);
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
