const ideas = [
  "A 20-minute lemon pasta",
  "Dinner with chickpeas & spinach",
  "Something chocolatey",
];

export function IdeaChips({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="idea-chips">
      <span>Or try</span>
      {ideas.map((idea) => (
        <button
          key={idea}
          type="button"
          disabled={disabled}
          onClick={() => {
            onSelect(`Generate a recipe: ${idea}`);
            document.getElementById("recipe-input")?.focus();
          }}
        >
          {idea}
          <span aria-hidden="true">↗</span>
        </button>
      ))}
    </div>
  );
}
