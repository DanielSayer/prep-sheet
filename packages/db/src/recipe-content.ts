import { z } from "zod";

const line = z.string().trim().min(1).max(2000);

export const recipeContentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(600),
  servings: z.string().max(80).nullable(),
  prepMinutes: z.number().int().min(0).max(10080).nullable(),
  cookMinutes: z.number().int().min(0).max(10080).nullable(),
  totalMinutes: z.number().int().min(0).max(10080).nullable(),
  ingredients: z.array(line).min(1).max(100),
  steps: z.array(line).min(1).max(100),
  notes: z.string().max(2000),
});

export type RecipeContent = z.infer<typeof recipeContentSchema>;
