import type { ComponentProps } from "react";
import type { RecipeDraft } from "./recipe-draft";

function InputField({
  label,
  ...props
}: ComponentProps<"input"> & { label: string }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}

function TextField({
  label,
  hint,
  ...props
}: ComponentProps<"textarea"> & { label: string; hint?: string }) {
  return (
    <label>
      {label}
      {hint && <small>{hint}</small>}
      <textarea {...props} />
    </label>
  );
}

export function RecipeFields({ content }: { content: RecipeDraft }) {
  return (
    <>
      <InputField
        label="Recipe name"
        name="title"
        required
        maxLength={160}
        defaultValue={content.title}
      />

      <TextField
        label="A little introduction"
        name="description"
        rows={2}
        maxLength={600}
        defaultValue={content.description}
      />

      <div className="form-row">
        <InputField
          label="Servings"
          name="servings"
          maxLength={80}
          defaultValue={content.servings ?? ""}
          placeholder="e.g. 4 people"
        />

        <InputField
          label="Prep (min)"
          name="prepMinutes"
          type="number"
          min={0}
          max={10080}
          defaultValue={content.prepMinutes ?? ""}
        />

        <InputField
          label="Cook (min)"
          name="cookMinutes"
          type="number"
          min={0}
          max={10080}
          defaultValue={content.cookMinutes ?? ""}
        />

        <InputField
          label="Total (min)"
          name="totalMinutes"
          type="number"
          min={0}
          max={10080}
          defaultValue={content.totalMinutes ?? ""}
        />
      </div>

      <TextField
        label="Ingredients"
        hint="One ingredient per line, including its quantity."
        name="ingredients"
        required
        rows={9}
        defaultValue={content.ingredients}
      />

      <TextField
        label="Method"
        hint="One step per line."
        name="steps"
        required
        rows={10}
        defaultValue={content.steps}
      />

      <TextField
        label="Kitchen notes"
        name="notes"
        rows={3}
        maxLength={2000}
        defaultValue={content.notes}
      />
    </>
  );
}
