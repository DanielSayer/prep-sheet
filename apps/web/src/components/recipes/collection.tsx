import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { ErrorNotice, LoadingState } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";
import { CollectionSelect, useCollection } from "../groups/collection-context";
import { EmptyCollection } from "./empty-collection";
import { RecipeCard } from "./recipe-card";

export function Collection() {
  const trpc = useTRPC();
  const { groupId, name } = useCollection();
  const query = useQuery(trpc.recipes.list.queryOptions({ groupId }));
  const [search, setSearch] = useState("");

  const recipes =
    (query.isError ? undefined : query.data)?.filter((recipe) =>
      recipe.title.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  return (
    <main id="main-content" className="collection-page page-width">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE GOOD STUFF, ALL TOGETHER</span>
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
          {query.data?.length ?? 0}{" "}
          {query.data?.length === 1 ? "recipe" : "recipes"} worth keeping
        </span>

        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">Search recipes</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a favourite..."
          />
        </label>
      </div>

      <LoadingState pending={query.isPending}>
        <ErrorNotice
          message={query.error?.message}
          retry={() => void query.refetch()}
        />

        {query.isSuccess && recipes.length === 0 && (
          <EmptyCollection searching={!!search} onClear={() => setSearch("")} />
        )}

        <div className="recipe-grid">
          {recipes.map((recipe, index) => (
            <RecipeCard key={recipe.id} recipe={recipe} colour={index % 3} />
          ))}
        </div>
      </LoadingState>
    </main>
  );
}
