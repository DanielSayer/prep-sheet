import { ArrowRight, Link2, LoaderCircle, Sparkles } from "lucide-react";
import type { SubmitEvent } from "react";

export function ComposerForm({
  input,
  pending,
  disabled,
  onChange,
  onSubmit,
}: {
  input: string;
  pending: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: SubmitEvent) => void;
}) {
  return (
    <form className="composer" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="recipe-input">
        Paste a recipe, a link, or describe a dish
      </label>

      <textarea
        id="recipe-input"
        value={input}
        onChange={(event) => onChange(event.target.value)}
        disabled={pending}
        maxLength={20000}
        placeholder="Paste a recipe or link, or tell us what's for dinner..."
      />

      <div className="composer-toolbar">
        <span>
          <Link2 size={17} /> Recipes, links & bright ideas
        </span>

        <button
          type="submit"
          className="button button-primary"
          disabled={disabled}
        >
          {pending ? (
            <>
              <LoaderCircle size={18} className="spin" /> Working on it
            </>
          ) : (
            <>
              <Sparkles size={18} /> Make it a keeper <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
