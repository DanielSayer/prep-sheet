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

      <h2>
        {searching
          ? "No recipes by that name"
          : "A fresh page. A hungry beginning."}
      </h2>

      <p>
        {searching
          ? "Try another name or clear your search."
          : "Your first keeper is just a recipe, a link or an idea away."}
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
          Find your first keeper <ArrowUpRight size={18} />
        </Link>
      )}
    </div>
  );
}
