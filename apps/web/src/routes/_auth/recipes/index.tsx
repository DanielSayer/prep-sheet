import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/recipes/collection";
import { type RecipeSort, recipeSorts } from "@/components/recipes/recipe-list";

export type CollectionSearch = {
  q?: string;
  favourites?: boolean;
  unrated?: boolean;
  tags?: string;
  sort?: RecipeSort;
};

export const Route = createFileRoute("/_auth/recipes/")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): CollectionSearch => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    favourites:
      search.favourites === true || search.favourites === "true"
        ? true
        : undefined,
    unrated:
      search.unrated === true || search.unrated === "true" ? true : undefined,
    tags:
      typeof search.tags === "string" && search.tags ? search.tags : undefined,
    sort: recipeSorts.includes(search.sort as RecipeSort)
      ? (search.sort as RecipeSort)
      : undefined,
  }),
  component: Collection,
});
