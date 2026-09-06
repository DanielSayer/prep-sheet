import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { ErrorNotice, LoadingState } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";
import { EmptyCollection } from "./empty-collection";
import { RecipeCard } from "./recipe-card";

export function Collection() {
  const trpc = useTRPC();
  const query = useQuery(trpc.recipes.list.queryOptions());
  const [search, setSearch] = useState("");

  const recipes =
    query.data?.filter((recipe) =>
      recipe.title.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  return (
    <main id="main-content" className="collection-page page-width">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE GOOD STUFF, ALL TOGETHER</span>
          <h1>
            My collection<span className="title-dot">.</span>
          </h1>

          <p>Your future dinners will thank you.</p>
        </div>

        <Link to="/" className="button button-primary">
          <Plus size={18} /> Add a recipe
        </Link>
      </div>

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
