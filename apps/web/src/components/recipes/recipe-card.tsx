import type { RecipeContent } from "@prep-sheet/db/recipe-content";
import { Link } from "@tanstack/react-router";
import { BookOpen, Check, Clock } from "lucide-react";
import { FavouriteButton } from "./favourite-button";
import { RatingControl } from "./rating-control";
import { recipeTimeSummary } from "./recipe-time";

export function RecipeCard({
  recipe,
  selection,
}: {
  recipe: {
    id: string;
    title: string;
    content: RecipeContent;
    isFavourite: boolean;
    rating: number | null;
  };
  selection?: { selected: boolean; toggle: () => void };
}) {
  const time = recipeTimeSummary(recipe.content);

  return (
    <article className="recipe-card" data-selected={selection?.selected}>
      {selection && (
        <button
          type="button"
          className="recipe-card-select"
          aria-label={`Select ${recipe.title}`}
          aria-pressed={selection.selected}
          onClick={selection.toggle}
        />
      )}
      <div className="recipe-card-top">
        {selection ? (
          <>
            <BookOpen size={26} />
            <span className="recipe-selection-mark" aria-hidden="true">
              {selection.selected && <Check size={20} />}
            </span>
          </>
        ) : (
          <>
            <BookOpen size={26} />
            <FavouriteButton
              id={recipe.id}
              title={recipe.title}
              isFavourite={recipe.isFavourite}
            />
          </>
        )}
      </div>

      <h2>
        {selection ? (
          recipe.title
        ) : (
          <Link
            to="/recipes/$recipeId"
            params={{ recipeId: recipe.id }}
            state={{ fromRecipeCollection: true }}
            className="recipe-card-link"
          >
            {recipe.title}
          </Link>
        )}
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
        {!selection && (
          <RatingControl
            id={recipe.id}
            title={recipe.title}
            rating={recipe.rating}
            compact
          />
        )}
      </div>
    </article>
  );
}
