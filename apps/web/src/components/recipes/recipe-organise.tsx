import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, Download, ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { useTRPC } from "@/utils/trpc";
import { ErrorNotice } from "../feedback";
import { CopyRecipe } from "../groups/copy-recipe";
import { FavouriteButton } from "./favourite-button";
import { KeepAwake } from "./keep-awake";
import { OrganiseDialog } from "./organise-dialog";
import { RatingControl } from "./rating-control";
import { TagChoices } from "./tag-choices";
export function RecipeOrganise({
  recipe,
}: {
  recipe: {
    id: string;
    title: string;
    groupId: string | null;
    isFavourite: boolean;
    rating: number | null;
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
      <RatingControl
        id={recipe.id}
        title={recipe.title}
        rating={recipe.rating}
      />
      <div className="organise-actions">
        <KeepAwake />
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
        <a
          href={`/api/recipes/${recipe.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="organise-action"
        >
          <ExternalLink size={16} /> Open PDF
        </a>
        <a
          href={`/api/recipes/${recipe.id}/pdf`}
          download={`${recipe.title.replace(/[^a-z0-9 -]/gi, "").slice(0, 80) || "recipe"}.pdf`}
          className="organise-action"
        >
          <Download size={16} /> Download
        </a>
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
