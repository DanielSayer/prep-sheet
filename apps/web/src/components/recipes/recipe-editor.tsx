import {
  type RecipeContent,
  recipeContentSchema,
} from "@prep-sheet/db/recipe-content";
import { type SubmitEvent, useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { RecipeFields } from "./recipe-fields";

export function RecipeEditor({
  content,
  pending,
  error,
  onSave,
  onCancel,
}: {
  content: RecipeContent;
  pending: boolean;
  error?: string;
  onSave: (content: RecipeContent) => void;
  onCancel: () => void;
}) {
  const [validation, setValidation] = useState("");

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();

    const lines = (name: string) =>
      text(name)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const minutes = (name: string) => (text(name) ? Number(text(name)) : null);

    const result = recipeContentSchema.safeParse({
      title: text("title"),
      description: text("description"),
      servings: text("servings") || null,
      prepMinutes: minutes("prepMinutes"),
      cookMinutes: minutes("cookMinutes"),
      ingredients: lines("ingredients"),
      steps: lines("steps"),
      notes: text("notes"),
    });

    if (!result.success) {
      const issue = result.error.issues[0];
      setValidation(`${issue?.path.join(" ")}: ${issue?.message}`);

      return;
    }

    setValidation("");
    onSave(result.data);
  }

  return (
    <form className="recipe-editor" onSubmit={submit}>
      <fieldset disabled={pending}>
        <RecipeFields content={content} />
        <ErrorNotice message={validation || error} />
        <div className="editor-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button type="submit" className="button button-primary">
            {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
