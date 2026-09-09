import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorNotice, LoadingState } from "@/components/feedback";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";
import { useCollection } from "../groups/collection-context";
import { DeleteConfirmation } from "./delete-confirmation";
import { RecipeBody } from "./recipe-body";
import {
  readRecipeDraft,
  recipeDraftKey,
  writeRecipeDraft,
} from "./recipe-draft";
import { RecipeEditor } from "./recipe-editor";
import { RecipeHeading } from "./recipe-heading";
import { RecipeOrganise } from "./recipe-organise";

export function RecipeDetail({ id }: { id: string }) {
  const trpc = useTRPC();
  const { data: session } = authClient.useSession();
  const draftKey = recipeDraftKey(session?.user.id ?? "guest", id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const fromRecipeCollection = useLocation({
    select: (location) => location.state.fromRecipeCollection,
  });
  const recipe = useQuery(trpc.recipes.get.queryOptions({ id }));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setEditing(!!readRecipeDraft(draftKey));
  }, [draftKey]);
  const [confirming, setConfirming] = useState(false);
  const { groups, selectGroup } = useCollection();

  const returnToCollection = () => {
    if (recipe.data) selectGroup(recipe.data.groupId);
    if (fromRecipeCollection) router.history.back();
    else void navigate({ to: "/recipes" });
  };

  const update = useMutation(
    trpc.recipes.update.mutationOptions({
      onSuccess: async () => {
        writeRecipeDraft(draftKey, null);
        await Promise.all([
          recipe.refetch(),
          queryClient.invalidateQueries({
            queryKey: trpc.recipes.list.queryKey(),
          }),
        ]);

        setEditing(false);
        toast.success("Recipe updated.");
      },
    }),
  );

  const remove = useMutation(
    trpc.recipes.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.recipes.list.queryKey(),
        });

        toast.success("Recipe removed.");
        returnToCollection();
      },
    }),
  );

  return (
    <main id="main-content" className="detail-page page-width">
      {fromRecipeCollection ? (
        <button
          type="button"
          className="back-link"
          onClick={returnToCollection}
        >
          <ArrowLeft size={17} />{" "}
          {recipe.data?.groupId
            ? (groups.data?.find((group) => group.id === recipe.data?.groupId)
                ?.name ?? "Group collection")
            : "Personal collection"}
        </button>
      ) : (
        <Link
          to="/recipes"
          className="back-link"
          onClick={() => {
            if (recipe.data) selectGroup(recipe.data.groupId);
          }}
        >
          <ArrowLeft size={17} />{" "}
          {recipe.data?.groupId
            ? (groups.data?.find((group) => group.id === recipe.data?.groupId)
                ?.name ?? "Group collection")
            : "Personal collection"}
        </Link>
      )}

      <LoadingState pending={recipe.isPending}>
        <ErrorNotice
          message={recipe.error?.message}
          retry={() => void recipe.refetch()}
        />

        {recipe.data && !recipe.isError && (
          <>
            <RecipeHeading
              recipe={recipe.data}
              editing={editing}
              onEdit={() => setEditing(true)}
              onDelete={() => setConfirming(true)}
            />
            {!editing && <RecipeOrganise key={id} recipe={recipe.data} />}

            {confirming && (
              <DeleteConfirmation
                shared={!!recipe.data.groupId}
                pending={remove.isPending}
                onCancel={() => setConfirming(false)}
                onConfirm={() => remove.mutate({ id })}
              />
            )}

            <ErrorNotice message={remove.error?.message} />
            {editing ? (
              <RecipeEditor
                key={draftKey}
                draftKey={draftKey}
                content={recipe.data.content}
                pending={update.isPending}
                error={update.error?.message}
                onSave={(content) => update.mutate({ id, content })}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <RecipeBody key={id} content={recipe.data.content} />
            )}
          </>
        )}
      </LoadingState>
    </main>
  );
}
