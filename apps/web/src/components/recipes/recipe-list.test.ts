import type { RecipeContent } from "@prep-sheet/db/recipe-content";
import { describe, expect, it } from "vitest";
import { type CollectionRecipe, filterAndSortRecipes } from "./recipe-list";

const content = (overrides: Partial<RecipeContent> = {}): RecipeContent => ({
  title: "Recipe",
  description: "",
  servings: null,
  prepMinutes: 10,
  cookMinutes: 20,
  totalMinutes: 30,
  ingredients: ["1 onion"],
  steps: ["Cook it"],
  notes: "",
  ...overrides,
});

const recipe = (
  id: string,
  title: string,
  overrides: Partial<CollectionRecipe> = {},
): CollectionRecipe => ({
  id,
  title,
  content: content({ title }),
  createdAt: new Date(`2026-09-0${id}T00:00:00Z`),
  isFavourite: false,
  rating: null,
  tagIds: [],
  ...overrides,
});

const filters = {
  search: "",
  favouritesOnly: false,
  unratedOnly: false,
  tagIds: [] as string[],
  sort: "newest" as const,
};

describe("filterAndSortRecipes", () => {
  it("matches recipe names and ingredients without case sensitivity", () => {
    const recipes = [
      recipe("1", "Tomato pasta"),
      recipe("2", "Green soup", {
        content: content({
          title: "Green soup",
          ingredients: ["2 ripe TOMATOES"],
        }),
      }),
      recipe("3", "Apple crumble"),
    ];

    expect(
      filterAndSortRecipes(recipes, { ...filters, search: "tomato" }).map(
        ({ id }) => id,
      ),
    ).toEqual(["2", "1"]);
  });

  it("sorts names naturally and without case sensitivity", () => {
    const recipes = [
      recipe("1", "Soup 10"),
      recipe("2", "apple pie"),
      recipe("3", "Soup 2"),
    ];

    expect(
      filterAndSortRecipes(recipes, {
        ...filters,
        sort: "name",
      }).map(({ title }) => title),
    ).toEqual(["apple pie", "Soup 2", "Soup 10"]);
  });

  it("sorts elapsed time ascending and puts incomplete times last", () => {
    const recipes = [
      recipe("1", "Unknown", {
        content: content({
          prepMinutes: null,
          cookMinutes: null,
          totalMinutes: null,
        }),
      }),
      recipe("2", "Long", {
        content: content({
          prepMinutes: 20,
          cookMinutes: 40,
          totalMinutes: 90,
        }),
      }),
      recipe("3", "Quick", {
        content: content({ prepMinutes: 5, cookMinutes: 10, totalMinutes: 15 }),
      }),
    ];

    expect(
      filterAndSortRecipes(recipes, {
        ...filters,
        sort: "cooking-time",
      }).map(({ title }) => title),
    ).toEqual(["Quick", "Long", "Unknown"]);
  });

  it("does not sort a partial duration as though it were complete", () => {
    const recipes = [
      recipe("1", "Partial", {
        content: content({
          prepMinutes: null,
          cookMinutes: 5,
          totalMinutes: null,
        }),
      }),
      recipe("2", "Complete", {
        content: content({
          prepMinutes: 10,
          cookMinutes: 10,
          totalMinutes: null,
        }),
      }),
    ];

    expect(
      filterAndSortRecipes(recipes, {
        ...filters,
        sort: "cooking-time",
      }).map(({ title }) => title),
    ).toEqual(["Complete", "Partial"]);
  });

  it("sorts ratings descending and puts unrated recipes last", () => {
    const recipes = [
      recipe("1", "Unrated"),
      recipe("2", "Good", { rating: 4 }),
      recipe("3", "Favourite", { rating: 5 }),
    ];

    expect(
      filterAndSortRecipes(recipes, {
        ...filters,
        sort: "highest-rated",
      }).map(({ title }) => title),
    ).toEqual(["Favourite", "Good", "Unrated"]);
  });

  it("can show only unrated recipes", () => {
    const recipes = [
      recipe("1", "Unrated"),
      recipe("2", "Rated", { rating: 3 }),
    ];

    expect(
      filterAndSortRecipes(recipes, { ...filters, unratedOnly: true }).map(
        ({ title }) => title,
      ),
    ).toEqual(["Unrated"]);
  });

  it("applies favourites and every selected tag", () => {
    const recipes = [
      recipe("1", "One", {
        isFavourite: true,
        tagIds: ["quick", "vegan"],
      }),
      recipe("2", "Two", {
        isFavourite: true,
        tagIds: ["quick"],
      }),
    ];

    expect(
      filterAndSortRecipes(recipes, {
        ...filters,
        favouritesOnly: true,
        tagIds: ["quick", "vegan"],
      }).map(({ id }) => id),
    ).toEqual(["1"]);
  });
});
