import { Pencil, Trash2 } from "lucide-react";

export function RecipeHeading({
  recipe,
  editing,
  onEdit,
  onDelete,
}: {
  recipe: { title: string; origin: string; sourceUrl: string | null };
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">
          {editing ? "A LITTLE TWEAK" : "READY WHEN YOU'RE HUNGRY"}
        </span>

        <h1>{recipe.title}</h1>
        <p>
          {recipe.origin === "generated"
            ? "AI-generated recipe. Give it a read before you cook."
            : "Saved from a recipe you found."}

          {recipe.sourceUrl && (
            <>
              {" "}
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-button"
              >
                Original recipe ↗
              </a>
            </>
          )}
        </p>
      </div>

      {!editing && (
        <div className="detail-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={onEdit}
          >
            <Pencil size={17} /> Edit
          </button>

          <button
            type="button"
            className="icon-button"
            aria-label="Delete recipe"
            onClick={onDelete}
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
