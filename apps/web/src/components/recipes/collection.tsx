import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Heart, Plus, Search, Star, Tags as TagsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorNotice, LoadingState } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";
import { CollectionSelect, useCollection } from "../groups/collection-context";
import { BulkTagDialog } from "./bulk-tag-dialog";
import { EmptyCollection } from "./empty-collection";
import { RecipeCard } from "./recipe-card";
import { filterAndSortRecipes, type RecipeSort } from "./recipe-list";
import { SortDropdown } from "./sort-dropdown";
import { TagChoices } from "./tag-choices";

const collectionRoute = getRouteApi("/_auth/recipes/");

export function Collection() {
  const trpc = useTRPC();
  const { groupId, name } = useCollection();
  const query = useQuery(trpc.recipes.list.queryOptions({ groupId }));
  const filters = collectionRoute.useSearch();
  const navigate = collectionRoute.useNavigate();
  const search = filters.q ?? "";
  const favouritesOnly = filters.favourites ?? false;
  const unratedOnly = filters.unrated ?? false;
  const selectedTags = filters.tags?.split(",").filter(Boolean) ?? [];
  const sort = filters.sort ?? "newest";
  const tags = useQuery(trpc.tags.list.queryOptions());
  const activeTags = selectedTags.filter((id) =>
    tags.data?.some((tag) => tag.id === id),
  );
  const filterCount =
    activeTags.length + Number(favouritesOnly) + Number(unratedOnly);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);

  useEffect(() => {
    void groupId;
    setBulkMode(false);
    setBulkDialog(false);
    setSelectedRecipeIds([]);
  }, [groupId]);

  const recipes = filterAndSortRecipes(
    query.isError ? [] : (query.data ?? []),
    { search, favouritesOnly, unratedOnly, tagIds: activeTags, sort },
  );
  const visibleIds = recipes.map((recipe) => recipe.id);
  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedRecipeIds.includes(id));

  const updateFilters = (next: {
    q?: string;
    favourites?: boolean;
    unrated?: boolean;
    tags?: string;
    sort?: RecipeSort;
  }) =>
    void navigate({
      search: (old) => ({ ...old, ...next }),
      replace: true,
      resetScroll: false,
    });

  return (
    <main id="main-content" className="collection-page page-width">
      <div className="page-heading">
        <div>
          <h1>
            {name}
            <span className="title-dot">.</span>
          </h1>

          <p>
            {groupId
              ? "Recipes everyone in your group can cook, edit and add to."
              : "Just for you. Your personal recipes stay private."}
          </p>
        </div>

        <Link to="/" className="button button-primary">
          <Plus size={18} /> Add a recipe
        </Link>
      </div>

      <CollectionSelect />
      <div className="collection-toolbar">
        <div className="collection-count">
          <span>
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
          </span>
          {!bulkMode && query.isSuccess && query.data.length > 0 && (
            <button
              type="button"
              className="button button-small button-outline"
              onClick={() => setBulkMode(true)}
            >
              <TagsIcon size={17} aria-hidden="true" /> Tag recipes
            </button>
          )}
        </div>

        <div className="collection-toolbar-controls">
          <SortDropdown
            value={sort}
            onValueChange={(value) => updateFilters({ sort: value })}
          />

          <label className="search-box">
            <Search size={18} />
            <span className="sr-only">Search recipes</span>
            <input
              value={search}
              onChange={(event) =>
                updateFilters({ q: event.target.value || undefined })
              }
              placeholder="Search names or ingredients..."
            />
          </label>
        </div>
      </div>

      {bulkMode && (
        <section className="bulk-tag-bar" aria-label="Bulk tagging">
          <div>
            <strong aria-live="polite">
              {selectedRecipeIds.length}{" "}
              {selectedRecipeIds.length === 1 ? "recipe" : "recipes"} selected
            </strong>
            <span className="muted">
              {selectedRecipeIds.length > 100
                ? "Choose no more than 100 recipes at a time."
                : "Click cards to select up to 100 recipes."}
            </span>
          </div>
          <div className="bulk-tag-bar-actions">
            <button
              type="button"
              className="text-button"
              disabled={visibleIds.length === 0}
              onClick={() =>
                setSelectedRecipeIds((current) =>
                  allVisibleSelected
                    ? current.filter((id) => !visibleIds.includes(id))
                    : [...new Set([...current, ...visibleIds])],
                )
              }
            >
              {allVisibleSelected ? "Deselect all" : "Select all"}
            </button>
            <button
              type="button"
              className="button button-small button-primary"
              disabled={
                selectedRecipeIds.length === 0 ||
                selectedRecipeIds.length > 100 ||
                !tags.data?.length
              }
              onClick={() => setBulkDialog(true)}
            >
              Choose tags
            </button>
            <button
              type="button"
              className="bulk-tag-cancel text-button"
              aria-label="Cancel bulk tagging"
              onClick={() => {
                setBulkMode(false);
                setSelectedRecipeIds([]);
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <section
        className="collection-tag-filters"
        aria-label="Match all selected tags"
      >
        <button
          type="button"
          className="organise-action"
          aria-pressed={favouritesOnly}
          onClick={() =>
            updateFilters({ favourites: favouritesOnly ? undefined : true })
          }
        >
          <Heart size={17} fill={favouritesOnly ? "currentColor" : "none"} />
          Show favourites
        </button>
        <button
          type="button"
          className="organise-action"
          aria-pressed={unratedOnly}
          onClick={() =>
            updateFilters({ unrated: unratedOnly ? undefined : true })
          }
        >
          <Star size={17} />
          Show unrated
        </button>
        <TagChoices
          tags={tags.data ?? []}
          selected={activeTags}
          toggle={(id) => {
            const next = selectedTags.includes(id)
              ? selectedTags.filter((tag) => tag !== id)
              : [...selectedTags, id];
            updateFilters({ tags: next.length ? next.join(",") : undefined });
          }}
        />
        {filterCount > 0 && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              updateFilters({
                favourites: undefined,
                unrated: undefined,
                tags: undefined,
              });
            }}
          >
            Clear filters
          </button>
        )}
      </section>
      <ErrorNotice
        message={tags.error?.message}
        retry={() => void tags.refetch()}
      />
      {tags.isPending && <p role="status">Loading tags...</p>}

      <LoadingState pending={query.isPending}>
        <ErrorNotice
          message={query.error?.message}
          retry={() => void query.refetch()}
        />

        {query.isSuccess && recipes.length === 0 && (
          <EmptyCollection
            searching={!!search}
            favouritesOnly={favouritesOnly}
            unratedOnly={unratedOnly}
            tagged={activeTags.length > 0}
            onClear={() => {
              updateFilters({
                q: undefined,
                favourites: undefined,
                unrated: undefined,
                tags: undefined,
              });
            }}
          />
        )}

        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              selection={
                bulkMode
                  ? {
                      selected: selectedRecipeIds.includes(recipe.id),
                      toggle: () =>
                        setSelectedRecipeIds((current) =>
                          current.includes(recipe.id)
                            ? current.filter((id) => id !== recipe.id)
                            : [...current, recipe.id],
                        ),
                    }
                  : undefined
              }
            />
          ))}
        </div>
      </LoadingState>
      {bulkDialog && (
        <BulkTagDialog
          recipeIds={selectedRecipeIds}
          tags={tags.data ?? []}
          onClose={() => setBulkDialog(false)}
          onApplied={() => {
            setBulkDialog(false);
            setBulkMode(false);
            setSelectedRecipeIds([]);
          }}
        />
      )}
    </main>
  );
}
