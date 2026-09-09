import {
  type RecipeContent,
  recipeContentSchema,
} from "@prep-sheet/db/recipe-content";
import { useBlocker } from "@tanstack/react-router";
import { type SubmitEvent, useEffect, useState } from "react";
import { ErrorNotice } from "../feedback";
import {
  readRecipeDraft,
  readRecipeFields,
  recipeFields,
  writeRecipeDraft,
} from "./recipe-draft";
import { RecipeFields } from "./recipe-fields";

export function RecipeEditor({
  content,
  draftKey,
  resetLabel = "Revert changes",
  pending,
  error,
  onSave,
  onCancel,
  saveLabel = "Save changes",
}: {
  content: RecipeContent;
  draftKey: string;
  resetLabel?: string;
  pending: boolean;
  error?: string;
  onSave: (content: RecipeContent) => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const [validation, setValidation] = useState("");

  const [initial] = useState(() => recipeFields(content));
  const [fields, setFields] = useState(initial);
  const [revision, setRevision] = useState(0);
  const [storageFailed, setStorageFailed] = useState(false);
  const dirty = JSON.stringify(fields) !== JSON.stringify(initial);

  useEffect(() => {
    const saved = readRecipeDraft(draftKey);
    if (saved) {
      setFields(saved);
      setRevision((value) => value + 1);
    }
  }, [draftKey]);

  useBlocker({
    shouldBlockFn: () =>
      dirty &&
      storageFailed &&
      !window.confirm(
        "Your draft could not be saved in this browser. Leave and lose these changes?",
      ),
    enableBeforeUnload: false,
  });

  useEffect(() => {
    if (!dirty || !storageFailed) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, storageFailed]);

  function discard(close: boolean) {
    if (
      dirty &&
      !window.confirm("Discard your unsaved changes? This cannot be undone.")
    )
      return;
    if (!writeRecipeDraft(draftKey, null)) {
      setStorageFailed(true);
      setValidation("Couldn't clear the saved draft. Please try again.");
      return;
    }
    setFields(initial);
    setRevision((value) => value + 1);
    setValidation("");
    setStorageFailed(false);
    if (close) onCancel();
  }

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
      totalMinutes: minutes("totalMinutes"),
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
    <form
      className="recipe-editor"
      onSubmit={submit}
      onChange={(event) => {
        const next = readRecipeFields(event.currentTarget);
        setFields(next);
        setStorageFailed(
          !writeRecipeDraft(
            draftKey,
            JSON.stringify(next) === JSON.stringify(initial) ? null : next,
          ),
        );
      }}
    >
      <fieldset disabled={pending}>
        <RecipeFields key={revision} content={fields} />
        {dirty && (
          <p role="status">
            {storageFailed
              ? "Draft could not be saved in this browser. Keep this page open until you save your recipe."
              : "Draft saved in this tab. You can leave and come back."}
          </p>
        )}
        <ErrorNotice message={validation || error} />
        <div className="editor-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={() => discard(true)}
          >
            Cancel
          </button>

          <button
            type="button"
            className="button button-outline"
            disabled={!dirty}
            onClick={() => discard(false)}
          >
            {resetLabel}
          </button>
          <button type="submit" className="button button-primary">
            {pending ? "Saving..." : saveLabel}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
