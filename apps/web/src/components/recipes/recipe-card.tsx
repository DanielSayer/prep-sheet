import type { RecipeContent } from "@prep-sheet/db/recipe-content";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, Clock, Sparkles } from "lucide-react";

export function RecipeCard({
  recipe,
  colour,
}: {
  recipe: { id: string; title: string; content: RecipeContent; origin: string };
  colour: number;
}) {
  const { prepMinutes, cookMinutes } = recipe.content;

  const time =
    prepMinutes === null && cookMinutes === null
      ? "Time not listed"
      : `${(prepMinutes ?? 0) + (cookMinutes ?? 0)} min`;

  return (
    <Link
      to="/recipes/$recipeId"
      params={{ recipeId: recipe.id }}
      className={`recipe-card recipe-colour-${colour}`}
    >
      <div className="recipe-card-top">
        <BookOpen size={26} />
        <span className="recipe-label">
          {recipe.origin === "generated" ? (
            <>
              <Sparkles size={13} /> Dreamed up
            </>
          ) : (
            "A saved favourite"
          )}
        </span>
      </div>

      <h2>{recipe.title}</h2>
      <p>
        {recipe.content.description ||
          `${recipe.content.ingredients.length} ingredients. Something good for dinner.`}
      </p>

      <div className="recipe-card-bottom">
        <span>
          <Clock size={15} />
          {time}
        </span>

        <span className="card-arrow">
          <ArrowUpRight size={22} />
        </span>
      </div>
    </Link>
  );
}
