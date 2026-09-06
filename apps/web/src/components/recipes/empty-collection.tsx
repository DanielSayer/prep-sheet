import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen } from "lucide-react";

export function EmptyCollection({
  searching,
  onClear,
}: {
  searching: boolean;
  onClear: () => void;
}) {
  return (
    <div className="empty-collection">
      <span className="empty-icon">
        <BookOpen size={46} />
      </span>

      <h2>{searching ? "No recipes by that name" : "No recipes yet"}</h2>

      <p>
        {searching
          ? "Try another name or clear your search."
          : "Paste a recipe or link, or describe a dish to get started."}
      </p>

      {searching ? (
        <button
          type="button"
          className="button button-outline"
          onClick={onClear}
        >
          Clear search
        </button>
      ) : (
        <Link to="/" className="button button-primary">
          Add a recipe <ArrowUpRight size={18} />
        </Link>
      )}
    </div>
  );
}
