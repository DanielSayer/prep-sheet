import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Search, Star } from "lucide-react";
import { useState } from "react";
import { ErrorNotice, LoadingState } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";
import { CollectionSelect, useCollection } from "../groups/collection-context";
import { EmptyCollection } from "./empty-collection";
import { RecipeCard } from "./recipe-card";
import { TagChoices } from "./tag-choices";

export function Collection() {
  const trpc = useTRPC();
  const { groupId, name } = useCollection();
  const query = useQuery(trpc.recipes.list.queryOptions({ groupId }));
  const [search, setSearch] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const tags = useQuery(trpc.tags.list.queryOptions());
  const activeTags = selectedTags.filter((id) =>
    tags.data?.some((tag) => tag.id === id),
  );
  const filterCount = activeTags.length + Number(favouritesOnly);

  const recipes =
    (query.isError ? undefined : query.data)?.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(search.toLowerCase()) &&
        (!favouritesOnly || recipe.isFavourite) &&
        activeTags.every((id) => recipe.tagIds.includes(id)),
    ) ?? [];

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

        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">Search recipes</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipes..."
          />
        </label>
      </div>

      <section
        className="collection-tag-filters"
        aria-label="Match all selected tags"
      >
        <button
          type="button"
          className="organise-action"
          aria-pressed={favouritesOnly}
          onClick={() => setFavouritesOnly(!favouritesOnly)}
        >
          <Star size={17} fill={favouritesOnly ? "currentColor" : "none"} />
          Show favourites
        </button>
        <TagChoices
          tags={tags.data ?? []}
          selected={activeTags}
          toggle={(id) =>
            setSelectedTags((old) =>
              old.includes(id) ? old.filter((tag) => tag !== id) : [...old, id],
            )
          }
        />
        {filterCount > 0 && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSelectedTags([]);
              setFavouritesOnly(false);
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
            tagged={activeTags.length > 0}
            onClear={() => {
              setSearch("");
              setFavouritesOnly(false);
              setSelectedTags([]);
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
