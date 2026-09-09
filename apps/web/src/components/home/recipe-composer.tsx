import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type SubmitEvent, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";
import { CollectionSelect, useCollection } from "../groups/collection-context";
import { ComposerFeedback } from "./composer-feedback";
import { ComposerForm } from "./composer-form";
import { IdeaChips } from "./idea-chips";
import { ManualRecipe } from "./manual-recipe";

const draftKey = "prep-sheet-draft";

export function RecipeComposer() {
  const [manual, setManual] = useState(false);
  const [input, setInput] = useState("");
  const [requestId, setRequestId] = useState<string>();
  const { groupId, available } = useCollection();
  const previousGroup = useRef(groupId);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const create = useMutation(
    trpc.recipes.create.mutationOptions({
      onSuccess: () => {
        setInput("");
        setRequestId(undefined);
        sessionStorage.removeItem(draftKey);

        void queryClient.invalidateQueries({
          queryKey: trpc.recipes.list.queryKey(),
        });
      },
    }),
  );

  useEffect(() => {
    setInput(sessionStorage.getItem(draftKey) ?? "");
  }, []);

  useEffect(() => {
    if (previousGroup.current === groupId) return;
    previousGroup.current = groupId;
    setRequestId(undefined);
    create.reset();
  }, [groupId, create.reset]);

  function change(value: string) {
    setInput(value);
    setRequestId(undefined);
    create.reset();
    sessionStorage.setItem(draftKey, value);
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();

    if (create.isPending || !available || input.trim().length < 3) return;

    if (!session) {
      void navigate({ to: "/login" });

      return;
    }

    const id = requestId ?? crypto.randomUUID();
    setRequestId(id);
    create.mutate({ id, input, groupId });
  }

  return (
    <section className="composer-section" aria-label="Add a recipe">
      {manual ? (
        <ManualRecipe onCancel={() => setManual(false)} />
      ) : (
        <>
          {session && (
            <CollectionSelect label="Save to" disabled={create.isPending} />
          )}
          <ComposerForm
            input={input}
            pending={create.isPending}
            disabled={
              create.isPending ||
              !available ||
              sessionPending ||
              input.trim().length < 3
            }
            onChange={change}
            onSubmit={submit}
            manualDisabled={create.isPending || sessionPending}
            onManual={() => {
              if (!session) {
                void navigate({ to: "/login" });
                return;
              }
              setManual(true);
            }}
          />

          <ComposerFeedback
            pending={create.isPending}
            error={create.error?.message}
            saved={create.data}
          />

          <IdeaChips disabled={create.isPending} onSelect={change} />
          <p className="composer-footnote">Less scrolling. More cooking.</p>
        </>
      )}
    </section>
  );
}
