import { expect, it } from "vitest";
import { recipeFields } from "./recipe-draft";
import { mergeRecipeDraft } from "./recipe-merge";

const base = recipeFields({
  title: "Soup",
  description: "",
  servings: "2",
  prepMinutes: null,
  cookMinutes: null,
  totalMinutes: null,
  ingredients: ["1 onion"],
  steps: ["Cook."],
  notes: "A note",
});
it("keeps identical edits and intentional deletions without conflicts", () => {
  const result = mergeRecipeDraft(
    base,
    { ...base, title: "Stew", notes: "" },
    { ...base, title: "Stew", servings: "4" },
  );
  expect(result.conflicts).toEqual([]);
  expect(result.merged).toEqual({
    ...base,
    title: "Stew",
    notes: "",
    servings: "4",
  });
});
it("treats ingredient and method edits as whole sections", () => {
  const result = mergeRecipeDraft(
    base,
    { ...base, ingredients: "2 onions", steps: "Roast." },
    { ...base, ingredients: "1 onion\n1 carrot", steps: "Cook.\nServe." },
  );
  expect(result.conflicts).toEqual(["ingredients", "steps"]);
  expect(result.merged.ingredients).toBe("2 onions");
  expect(result.merged.steps).toBe("Roast.");
});
it("requires explicit choices for different legacy values without an original snapshot", () => {
  expect(
    mergeRecipeDraft(
      null,
      { ...base, notes: "Old draft" },
      { ...base, servings: "4" },
    ).conflicts,
  ).toEqual(["servings", "notes"]);
});
