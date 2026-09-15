import type { RecipeContent } from "@prep-sheet/db/recipe-content";
import { ingredientKeys, useIngredientProgress } from "./ingredient-progress";

export function RecipeBody({
  content,
  progressKey,
}: {
  content: RecipeContent;
  progressKey?: string;
}) {
  const { checked, update, storageFailed } = useIngredientProgress(progressKey);
  const keys = ingredientKeys(content.ingredients);
  const currentChecks = new Set(keys.filter((key) => checked.has(key)));
  return (
    <div className="recipe-body">
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
        {content.totalMinutes != null && (
          <div>
            <dt>Elapsed</dt>
            <dd>{content.totalMinutes} min</dd>
          </div>
        )}
      </dl>
      {content.description && (
        <p className="recipe-description">{content.description}</p>
      )}
      <div className="recipe-columns">
        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" tabIndex={-1}>
            Ingredients
          </h2>
          <div className="ingredient-progress">
            <span>
              {currentChecks.size} of {content.ingredients.length} checked
            </span>
            <button
              type="button"
              className="text-button"
              disabled={currentChecks.size === 0}
              onClick={() => update(new Set())}
            >
              Reset
            </button>
          </div>
          {storageFailed && (
            <p className="muted" role="status">
              Progress cannot be saved on this device. Keep this recipe open to
              retain your checks.
            </p>
          )}
          <ul className="recipe-ingredients">
            {content.ingredients.map((ingredient, index) => (
              <li key={index}>
                <label className="ingredient-check">
                  <input
                    type="checkbox"
                    checked={currentChecks.has(keys[index] ?? "")}
                    onChange={() => {
                      const key = keys[index];
                      if (!key) return;
                      const next = new Set(currentChecks);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      update(next);
                    }}
                  />
                  <span>{ingredient}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="method-heading">
          <h2 id="method-heading" tabIndex={-1}>
            Method
          </h2>
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
