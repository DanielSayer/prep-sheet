import type { RecipeContent } from "@prep-sheet/db/recipe-content";

export const recipeSorts = [
  "newest",
  "highest-rated",
  "name",
  "cooking-time",
] as const;

export type RecipeSort = (typeof recipeSorts)[number];

export type CollectionRecipe = {
  id: string;
  title: string;
  content: RecipeContent;
  createdAt: Date | string;
  isFavourite: boolean;
  rating: number | null;
  tagIds: string[];
};

type RecipeFilters = {
  search: string;
  favouritesOnly: boolean;
  unratedOnly: boolean;
  tagIds: string[];
  sort: RecipeSort;
};

const byName = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function totalCookingMinutes(recipe: CollectionRecipe) {
  const { prepMinutes, cookMinutes } = recipe.content;
  return prepMinutes === null && cookMinutes === null
    ? null
    : (prepMinutes ?? 0) + (cookMinutes ?? 0);
}

function compareRecipes(sort: RecipeSort) {
  return (left: CollectionRecipe, right: CollectionRecipe) => {
    if (sort === "name") return byName.compare(left.title, right.title);

    if (sort === "highest-rated") {
      if (left.rating === null && right.rating !== null) return 1;
      if (left.rating !== null && right.rating === null) return -1;
      if (left.rating !== null && right.rating !== null) {
        const difference = right.rating - left.rating;
        if (difference !== 0) return difference;
      }
      return byName.compare(left.title, right.title);
    }

    if (sort === "cooking-time") {
      const leftMinutes = totalCookingMinutes(left);
      const rightMinutes = totalCookingMinutes(right);
      if (leftMinutes === null && rightMinutes !== null) return 1;
      if (leftMinutes !== null && rightMinutes === null) return -1;
      if (leftMinutes !== null && rightMinutes !== null) {
        const difference = leftMinutes - rightMinutes;
        if (difference !== 0) return difference;
      }
      return byName.compare(left.title, right.title);
    }

    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  };
}

export function filterAndSortRecipes(
  recipes: CollectionRecipe[],
  filters: RecipeFilters,
) {
  const search = filters.search.trim().toLocaleLowerCase();

  return recipes
    .filter(
      (recipe) =>
        (!search ||
          recipe.title.toLocaleLowerCase().includes(search) ||
          recipe.content.ingredients.some((ingredient) =>
            ingredient.toLocaleLowerCase().includes(search),
          )) &&
        (!filters.favouritesOnly || recipe.isFavourite) &&
        (!filters.unratedOnly || recipe.rating === null) &&
        filters.tagIds.every((id) => recipe.tagIds.includes(id)),
    )
    .sort(compareRecipes(filters.sort));
}
