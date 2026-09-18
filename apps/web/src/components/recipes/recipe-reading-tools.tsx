import type { ReactNode } from "react";
import { KeepAwake } from "./keep-awake";

const sections = [
  { id: "ingredients-heading", label: "Ingredients" },
  { id: "method-heading", label: "Method" },
  { id: "recipe-history", label: "History" },
];

export function RecipeReadingTools({ children }: { children: ReactNode }) {
  return (
    <div className="recipe-reading-tools">
      <nav aria-label="Recipe sections">
        <span className="recipe-jump-label">Jump to</span>
        {sections.map(({ id, label }) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <div className="recipe-reading-actions">
        {children}
        <KeepAwake />
      </div>
    </div>
  );
}
