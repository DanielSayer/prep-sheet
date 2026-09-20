export function IdeaChips({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="idea-chips">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          onSelect(
            "Generate a recipe: lemon and chickpea pasta with spinach for two people, ready in 25 minutes.",
          );
          document.getElementById("recipe-input")?.focus();
        }}
      >
        Try a lemon pasta idea <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
