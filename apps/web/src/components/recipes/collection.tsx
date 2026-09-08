import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Heart, Plus, Search, Star } from "lucide-react";
import { ErrorNotice, LoadingState } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";
import { CollectionSelect, useCollection } from "../groups/collection-context";
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

  const recipes = filterAndSortRecipes(
    query.isError ? [] : (query.data ?? []),
    { search, favouritesOnly, unratedOnly, tagIds: activeTags, sort },
  );

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
        <span>
          {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
        </span>

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
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </LoadingState>
    </main>
  );
}
