import type { RecipeContent } from "@prep-sheet/db/recipe-content";

export function RecipeBody({ content }: { content: RecipeContent }) {
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
          <ul className="recipe-ingredients">
            {content.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
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
