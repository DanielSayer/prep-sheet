import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/utils/trpc";
import { ErrorNotice, LoadingState } from "../feedback";
import { useCollection } from "../groups/collection-context";
import { OrganiseDialog } from "./organise-dialog";
import { TagChoices } from "./tag-choices";

type TagOption = ComponentProps<typeof TagChoices>["tags"][number];

export function BulkTagDialog({
  recipeIds,
  tags,
  onClose,
  onApplied,
}: {
  recipeIds: string[];
  tags: TagOption[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const trpc = useTRPC();
  const client = useQueryClient();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const update = useMutation(
    trpc.recipes.setTags.mutationOptions({
      onSuccess: async ({ recipeCount, tagCount }, { operation }) => {
        await client.invalidateQueries({ queryKey: trpc.recipes.pathKey() });
        toast.success(
          `${operation === "add" ? "Added" : "Removed"} ${tagCount === 1 ? "tag" : "tags"} ${operation === "add" ? "to" : "from"} ${recipeCount} ${recipeCount === 1 ? "recipe" : "recipes"}.`,
        );
        onApplied();
      },
    }),
  );
  const toggle = (id: string) =>
    setTagIds((current) =>
      current.includes(id)
        ? current.filter((tagId) => tagId !== id)
        : [...current, id],
    );
  const pendingOperation = update.isPending
    ? update.variables?.operation
    : null;

  return (
    <OrganiseDialog title="Tag selected recipes" onClose={onClose}>
      <p>
        Choose tags, then add or remove them from {recipeIds.length}{" "}
        {recipeIds.length === 1 ? "recipe" : "recipes"}.
      </p>
      <TagChoices
        tags={tags}
        selected={tagIds}
        toggle={toggle}
        disabled={update.isPending}
      />
      {tags.length === 0 && <p className="muted">No tags available.</p>}
      <ErrorNotice message={update.error?.message} />
      <div className="organise-dialog-footer bulk-tag-actions">
        <button
          type="button"
          className="button button-outline"
          disabled={update.isPending || tagIds.length === 0}
          onClick={() =>
            update.mutate({ recipeIds, tagIds, operation: "remove" })
          }
        >
          {pendingOperation === "remove" ? "Removing..." : "Remove tags"}
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={update.isPending || tagIds.length === 0}
          onClick={() => update.mutate({ recipeIds, tagIds, operation: "add" })}
        >
          {pendingOperation === "add" ? "Adding..." : "Add tags"}
        </button>
      </div>
    </OrganiseDialog>
  );
}

export function ApplyTagDialog({
  tag,
  onClose,
  onApplied,
}: {
  tag: TagOption;
  onClose: () => void;
  onApplied?: () => void;
}) {
  const trpc = useTRPC();
  const client = useQueryClient();
  const { groups } = useCollection();
  const recipes = useQuery(trpc.recipes.taggingList.queryOptions());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const choices =
    recipes.data?.filter((recipe) => !recipe.tagIds.includes(tag.id)) ?? [];
  const searchTerm = search.trim().toLocaleLowerCase();
  const shown = choices.filter((recipe) =>
    recipe.title.toLocaleLowerCase().includes(searchTerm),
  );
  const shownIds = shown.map((recipe) => recipe.id);
  const everyShownSelected =
    shownIds.length > 0 && shownIds.every((id) => selected.includes(id));
  const update = useMutation(
    trpc.recipes.setTags.mutationOptions({
      onSuccess: async ({ recipeCount }) => {
        await client.invalidateQueries({ queryKey: trpc.recipes.pathKey() });
        toast.success(
          `${tag.name} added to ${recipeCount} ${recipeCount === 1 ? "recipe" : "recipes"}.`,
        );
        onApplied?.();
        onClose();
      },
    }),
  );

  const collectionName = (groupId: string | null) =>
    groupId
      ? (groups.data?.find((group) => group.id === groupId)?.name ??
        "Shared collection")
      : "Personal collection";

  return (
    <OrganiseDialog title={`Add ${tag.name} to recipes`} onClose={onClose}>
      <p>Choose up to 100 recipes. Recipes with this tag are hidden.</p>
      <LoadingState pending={recipes.isPending} label="Loading recipes...">
        <ErrorNotice
          message={recipes.error?.message}
          retry={() => void recipes.refetch()}
        />
        {choices.length > 0 && (
          <>
            <label className="search-box bulk-recipe-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search recipes</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search recipes..."
              />
            </label>
            <div className="bulk-recipe-controls">
              <span>
                {selected.length} {selected.length === 1 ? "recipe" : "recipes"}{" "}
                selected
              </span>
              <button
                type="button"
                className="text-button"
                disabled={update.isPending || shownIds.length === 0}
                onClick={() =>
                  setSelected((current) =>
                    everyShownSelected
                      ? current.filter((id) => !shownIds.includes(id))
                      : [...new Set([...current, ...shownIds])],
                  )
                }
              >
                {everyShownSelected ? "Clear shown" : "Select all shown"}
              </button>
            </div>
            <ul className="bulk-recipe-list">
              {shown.map((recipe) => (
                <li key={recipe.id}>
                  <label>
                    <input
                      type="checkbox"
                      disabled={update.isPending}
                      checked={selected.includes(recipe.id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(recipe.id)
                            ? current.filter((id) => id !== recipe.id)
                            : [...current, recipe.id],
                        )
                      }
                    />
                    <span>
                      <strong>{recipe.title}</strong>
                      <small>{collectionName(recipe.groupId)}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {shown.length === 0 && (
              <p className="muted">No recipes match that search.</p>
            )}
          </>
        )}
        {recipes.isSuccess && recipes.data.length === 0 && (
          <p className="muted">Add a recipe before applying this tag.</p>
        )}
        {recipes.isSuccess &&
          recipes.data.length > 0 &&
          choices.length === 0 && (
            <p className="muted">This tag is already on every recipe.</p>
          )}
      </LoadingState>
      <ErrorNotice message={update.error?.message} />
      {selected.length > 100 && (
        <p role="alert">Choose no more than 100 recipes at a time.</p>
      )}
      <div className="organise-dialog-footer">
        <button type="button" className="text-button" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={
            update.isPending || selected.length === 0 || selected.length > 100
          }
          onClick={() =>
            update.mutate({
              recipeIds: selected,
              tagIds: [tag.id],
              operation: "add",
            })
          }
        >
          {update.isPending ? "Adding..." : "Add to recipes"}
        </button>
      </div>
    </OrganiseDialog>
  );
}
