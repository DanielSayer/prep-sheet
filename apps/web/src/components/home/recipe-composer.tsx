import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type SubmitEvent, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";
import { ComposerFeedback } from "./composer-feedback";
import { ComposerForm } from "./composer-form";
import { IdeaChips } from "./idea-chips";

const draftKey = "prep-sheet-draft";

export function RecipeComposer() {
  const [input, setInput] = useState("");
  const [requestId, setRequestId] = useState<string>();
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

  function change(value: string) {
    setInput(value);
    setRequestId(undefined);
    create.reset();
    sessionStorage.setItem(draftKey, value);
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();

    if (create.isPending || input.trim().length < 3) return;

    if (!session) {
      void navigate({ to: "/login" });

      return;
    }

    const id = requestId ?? crypto.randomUUID();
    setRequestId(id);
    create.mutate({ id, input });
  }

  return (
    <section className="composer-section" aria-label="Add a recipe">
      <ComposerForm
        input={input}
        pending={create.isPending}
        disabled={create.isPending || sessionPending || input.trim().length < 3}
        onChange={change}
        onSubmit={submit}
      />

      <ComposerFeedback
        pending={create.isPending}
        error={create.error?.message}
        saved={create.data}
      />

      <IdeaChips disabled={create.isPending} onSelect={change} />
      <p className="composer-footnote">Less scrolling. More cooking.</p>
    </section>
  );
}
