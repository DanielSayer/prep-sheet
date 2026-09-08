import type { RecipeContent } from "@prep-sheet/db/recipe-content";
import { useState } from "react";

export function RecipeBody({ content }: { content: RecipeContent }) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  return (
    <div className="recipe-body">
      {content.description && (
        <p className="recipe-description">{content.description}</p>
      )}
      <dl className="recipe-meta">
        {content.servings && (
          <div>
            <dt>Servings</dt>
            <dd>{content.servings}</dd>
          </div>
        )}
        {content.prepMinutes !== null && (
          <div>
            <dt>Prep</dt>
            <dd>{content.prepMinutes} min</dd>
          </div>
        )}
        {content.cookMinutes !== null && (
          <div>
            <dt>Cook</dt>
            <dd>{content.cookMinutes} min</dd>
          </div>
        )}
      </dl>
      <div className="recipe-columns">
        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading">Ingredients</h2>
          <div className="ingredient-progress">
            <span>
              {checked.size} of {content.ingredients.length} checked
            </span>
            <button
              type="button"
              className="text-button"
              disabled={checked.size === 0}
              onClick={() => setChecked(new Set())}
            >
              Reset
            </button>
          </div>
          <ul className="recipe-ingredients">
            {content.ingredients.map((ingredient, index) => (
              <li key={index}>
                <label className="ingredient-check">
                  <input
                    type="checkbox"
                    checked={checked.has(index)}
                    onChange={() =>
                      setChecked((previous) => {
                        const next = new Set(previous);
                        if (next.has(index)) next.delete(index);
                        else next.add(index);
                        return next;
                      })
                    }
                  />
                  <span>{ingredient}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="method-heading">
          <h2 id="method-heading">Method</h2>
          <ol className="recipe-method">
            {content.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
      {content.notes && (
        <section className="recipe-notes" aria-labelledby="notes-heading">
          <h2 id="notes-heading">Kitchen notes</h2>
          <p>{content.notes}</p>
        </section>
      )}
    </div>
  );
}
