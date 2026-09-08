import type { RecipeContent } from "@prep-sheet/db/recipe-content";
import { Link } from "@tanstack/react-router";
import { BookOpen, Clock } from "lucide-react";
import { FavouriteButton } from "./favourite-button";

export function RecipeCard({
  recipe,
}: {
  recipe: {
    id: string;
    title: string;
    content: RecipeContent;
    isFavourite: boolean;
  };
}) {
  const { prepMinutes, cookMinutes } = recipe.content;

  const time =
    prepMinutes === null && cookMinutes === null
      ? "Time not listed"
      : `${(prepMinutes ?? 0) + (cookMinutes ?? 0)} min`;

  return (
    <article className="recipe-card">
      <div className="recipe-card-top">
        <BookOpen size={26} />
        <FavouriteButton
          id={recipe.id}
          title={recipe.title}
          isFavourite={recipe.isFavourite}
        />
      </div>

      <h2>
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: recipe.id }}
          className="recipe-card-link"
        >
          {recipe.title}
        </Link>
      </h2>
      <p>
        {recipe.content.description ||
          `${recipe.content.ingredients.length} ingredients. Something good for dinner.`}
      </p>

      <div className="recipe-card-bottom">
        <span>
          <Clock size={15} />
          {time}
        </span>
      </div>
    </article>
  );
}
