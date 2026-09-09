import type { RecipeContent } from "@prep-sheet/db/recipe-content";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";
import { CollectionSelect, useCollection } from "../groups/collection-context";
import { recipeDraftKey, writeRecipeDraft } from "../recipes/recipe-draft";
import { RecipeEditor } from "../recipes/recipe-editor";

const emptyRecipe: RecipeContent = {
  title: "",
  description: "",
  servings: null,
  prepMinutes: null,
  cookMinutes: null,
  totalMinutes: null,
  ingredients: [],
  steps: [],
  notes: "",
};

export function ManualRecipe({ onCancel }: { onCancel: () => void }) {
  const { data: session } = authClient.useSession();
  const draftKey = recipeDraftKey(session?.user.id ?? "guest");
  const { groupId, available } = useCollection();
  const request = useRef<{ id: string; groupId: string | null } | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const save = useMutation(
    trpc.recipes.createManual.mutationOptions({
      onSuccess: (recipe) => {
        writeRecipeDraft(draftKey, null);
        void queryClient.invalidateQueries({
          queryKey: trpc.recipes.list.queryKey(),
        });
        void navigate({
          to: "/recipes/$recipeId",
          params: { recipeId: recipe.id },
        });
      },
    }),
  );

  function submit(content: RecipeContent) {
    if (save.isPending || !available) return;
    if (!session) {
      void navigate({ to: "/login" });
      return;
    }
    if (!request.current || request.current.groupId !== groupId)
      request.current = { id: crypto.randomUUID(), groupId };
    save.mutate({ ...request.current, content });
  }

  return (
    <>
      {session && (
        <CollectionSelect label="Save to" disabled={save.isPending} />
      )}
      <RecipeEditor
        key={draftKey}
        draftKey={draftKey}
        resetLabel="Clear form"
        content={emptyRecipe}
        pending={save.isPending}
        error={
          !available
            ? "Choose an available collection to save your recipe."
            : save.error?.message
        }
        saveLabel="Save recipe"
        onSave={submit}
        onCancel={onCancel}
      />
    </>
  );
}
