import { recipeContentSchema } from "@prep-sheet/db/recipe-content";
import type { RecipeDraft } from "./recipe-draft";

export const recipeFieldNames = [
  { name: "title", label: "Recipe name" },
  { name: "description", label: "Introduction" },
  { name: "servings", label: "Servings" },
  { name: "prepMinutes", label: "Prep time" },
  { name: "cookMinutes", label: "Cook time" },
  { name: "totalMinutes", label: "Total time" },
  { name: "ingredients", label: "Ingredients" },
  { name: "steps", label: "Method" },
  { name: "notes", label: "Kitchen notes" },
] satisfies { name: keyof RecipeDraft; label: string }[];

export function mergeRecipeDraft(
  base: RecipeDraft | null,
  mine: RecipeDraft,
  saved: RecipeDraft,
) {
  const merged = { ...mine };
  const conflicts: (keyof RecipeDraft)[] = [];
  for (const { name } of recipeFieldNames) {
    if (mine[name] === saved[name]) continue;
    if (base && mine[name] === base[name]) merged[name] = saved[name];
    else if (!base || saved[name] !== base[name]) conflicts.push(name);
  }
  return { merged, conflicts };
}

export function parseRecipeDraft(fields: RecipeDraft) {
  const lines = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  const minutes = (value: string) => (value.trim() ? Number(value) : null);
  return recipeContentSchema.safeParse({
    title: fields.title.trim(),
    description: fields.description.trim(),
    servings: fields.servings.trim() || null,
    prepMinutes: minutes(fields.prepMinutes),
    cookMinutes: minutes(fields.cookMinutes),
    totalMinutes: minutes(fields.totalMinutes),
    ingredients: lines(fields.ingredients),
    steps: lines(fields.steps),
    notes: fields.notes.trim(),
  });
}
