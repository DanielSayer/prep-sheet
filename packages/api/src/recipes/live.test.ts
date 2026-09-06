import { mkdir, writeFile } from "node:fs/promises";
import { recipeContentSchema } from "@prep-sheet/db/recipe-content";
import { expect, it } from "vitest";
import { sampleRecipe } from "./fixtures";
import { generateRecipe } from "./generate";
import { recipePdf } from "./pdf";

it.skipIf(process.env.LIVE_AI_TEST !== "1")(
  "uses the configured OpenAI model for generation and pasted extraction",
  async () => {
    try {
      const generated = await generateRecipe(
        "Generate a simple lemon pasta recipe for two people.",
      );
      expect(recipeContentSchema.safeParse(generated.content).success).toBe(
        true,
      );
      expect(generated.origin).toBe("generated");
      const imported = await generateRecipe(
        "Tomato toast. Serves 1. Ingredients: 1 slice bread, 1 tomato, 1 tsp olive oil. Steps: Toast the bread. Slice the tomato. Put tomato on toast and drizzle with oil.",
      );
      expect(imported.origin).toBe("imported");
      expect(imported.content.ingredients).toHaveLength(3);
      await mkdir("tmp/pdfs", { recursive: true });
      await writeFile(
        "tmp/pdfs/live-recipe.pdf",
        await recipePdf(generated.content, null, generated.origin),
      );
    } catch (error) {
      // Print only the cause message; never request headers or credentials.
      const cause = (error as Error).cause;
      throw new Error(
        cause instanceof Error ? cause.message : (error as Error).message,
      );
    }
  },
  200000,
);

it("renders a recipe and a long recipe to paginated PDFs", async () => {
  await mkdir("tmp/pdfs", { recursive: true });
  const short = await recipePdf(
    sampleRecipe,
    "https://example.com/recipe",
    "imported",
  );
  expect(short.subarray(0, 5).toString()).toBe("%PDF-");
  await writeFile("tmp/pdfs/recipe.pdf", short);
  const long = await recipePdf(
    {
      ...sampleRecipe,
      title:
        "A long recipe with fractions, accents and temperature: ½ cup crème fraîche at 180°C",
      steps: Array.from(
        { length: 24 },
        (_, index) => `Step ${index + 1}. ${sampleRecipe.steps[index % 3]}`,
      ),
    },
    null,
    "generated",
  );
  await writeFile("tmp/pdfs/long-recipe.pdf", long);
});
