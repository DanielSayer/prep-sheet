import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, Plus } from "lucide-react";
import { useState } from "react";
import { useTRPC } from "@/utils/trpc";
import { ErrorNotice } from "../feedback";
import { CopyRecipe } from "../groups/copy-recipe";
import { FavouriteButton } from "./favourite-button";
import { OrganiseDialog } from "./organise-dialog";
import { TagChoices } from "./tag-choices";
export function RecipeOrganise({
  recipe,
}: {
  recipe: {
    id: string;
    title: string;
    groupId: string | null;
    isFavourite: boolean;
    tagIds: string[];
  };
}) {
  const trpc = useTRPC();
  const client = useQueryClient();
  const tags = useQuery(trpc.tags.list.queryOptions());
  const [dialog, setDialog] = useState<"tags" | "copy" | null>(null);
  const update = useMutation(
    trpc.recipes.setTag.mutationOptions({
      onSuccess: async () => {
        await client.invalidateQueries({ queryKey: trpc.recipes.pathKey() });
      },
    }),
  );
  const toggle = (tagId: string) =>
    update.mutate({
      id: recipe.id,
      tagId,
      selected: !recipe.tagIds.includes(tagId),
    });
  const chosen =
    tags.data?.filter((tag) => recipe.tagIds.includes(tag.id)) ?? [];
  return (
    <section className="recipe-organise" aria-label="Organise recipe">
      <div className="organise-actions">
        <FavouriteButton {...recipe} showLabel />
        <button
          type="button"
          className="organise-action"
          aria-haspopup="dialog"
          onClick={() => setDialog("tags")}
        >
          <Plus size={17} />
          Tags
        </button>
        <button
          type="button"
          className="organise-action"
          aria-haspopup="dialog"
          onClick={() => setDialog("copy")}
        >
          <Copy size={16} />
          Copy
        </button>
      </div>
      <TagChoices
        tags={chosen}
        selected={recipe.tagIds}
        toggle={toggle}
        disabled={update.isPending}
      />
      {tags.isSuccess && chosen.length === 0 && (
        <span className="muted">No tags yet</span>
      )}
      {!dialog && (
        <ErrorNotice message={update.error?.message || tags.error?.message} />
      )}
      {dialog === "tags" && (
        <OrganiseDialog
          title="Choose your tags"
          onClose={() => setDialog(null)}
        >
          <p>Tap a tag to add or remove it. These choices are just for you.</p>
          <ErrorNotice
            message={tags.error?.message}
            retry={() => void tags.refetch()}
          />
          {tags.isPending && <p role="status">Loading tags...</p>}
          <TagChoices
            tags={tags.data ?? []}
            selected={recipe.tagIds}
            toggle={toggle}
            disabled={update.isPending}
          />
          <ErrorNotice message={update.error?.message} />
          <div className="organise-dialog-footer">
            <Link to="/settings" className="text-button">
              Manage tags
            </Link>
            <button
              type="button"
              className="button button-primary"
              onClick={() => setDialog(null)}
            >
              Done
            </button>
          </div>
        </OrganiseDialog>
      )}
      {dialog === "copy" && (
        <OrganiseDialog
          title="Copy to a collection"
          onClose={() => setDialog(null)}
        >
          <CopyRecipe id={recipe.id} sourceGroupId={recipe.groupId} />
        </OrganiseDialog>
      )}
    </section>
  );
}
