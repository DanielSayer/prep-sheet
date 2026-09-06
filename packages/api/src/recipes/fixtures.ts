import type { RecipeContent } from "@prep-sheet/db/recipe-content";

export const sampleRecipe: RecipeContent = {
  title: "Lemon & chickpea pasta",
  description:
    "A quick, bright dinner with a silky lemon sauce and a handful of pantry staples.",
  servings: "2",
  prepMinutes: 5,
  cookMinutes: 15,
  ingredients: [
    "200 g pasta",
    "1 tbsp olive oil",
    "2 cloves garlic, finely sliced",
    "400 g tin chickpeas, drained",
    "1 lemon, zest and juice",
    "½ tsp chilli flakes",
    "60 g baby spinach",
    "Salt and black pepper, to taste",
  ],
  steps: [
    "Bring a large pan of salted water to the boil. Cook the pasta until al dente, reserving a mug of the cooking water before draining.",
    "Warm the oil in a large frying pan. Add garlic and chilli flakes and cook gently for one minute. Stir in the chickpeas and lemon zest.",
    "Add the pasta, spinach and a splash of pasta water. Toss until the spinach wilts and the sauce coats the pasta. Add the lemon juice, season and serve.",
  ],
  notes:
    "Add the pasta water a little at a time. Finish with a little grated parmesan if you like.",
};
