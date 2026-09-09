import type { RecipeContent } from "@prep-sheet/db/recipe-content";
import { z } from "zod";

const fieldsSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.string(),
  prepMinutes: z.string(),
  cookMinutes: z.string(),
  totalMinutes: z.string(),
  ingredients: z.string(),
  steps: z.string(),
  notes: z.string(),
});

export type RecipeDraft = z.infer<typeof fieldsSchema>;

export function recipeDraftKey(userId: string, recipeId = "manual") {
  return `prep-sheet-recipe-draft:v1:${userId}:${recipeId}`;
}

export function recipeFields(content: RecipeContent): RecipeDraft {
  return {
    title: content.title,
    description: content.description,
    servings: content.servings ?? "",
    prepMinutes: String(content.prepMinutes ?? ""),
    cookMinutes: String(content.cookMinutes ?? ""),
    totalMinutes: String(content.totalMinutes ?? ""),
    ingredients: content.ingredients.join("\n"),
    steps: content.steps.join("\n"),
    notes: content.notes,
  };
}

export function readRecipeDraft(key: string): RecipeDraft | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null");
    const result = fieldsSchema.safeParse(value);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function writeRecipeDraft(key: string, draft: RecipeDraft | null) {
  try {
    if (draft === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function readRecipeFields(form: HTMLFormElement): RecipeDraft {
  return fieldsSchema.parse(Object.fromEntries(new FormData(form)));
}
