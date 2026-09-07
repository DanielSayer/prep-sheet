import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen } from "lucide-react";

export function EmptyCollection({
  searching,
  favouritesOnly,
  onClear,
}: {
  searching: boolean;
  favouritesOnly: boolean;
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
          : favouritesOnly
            ? "No favourites yet"
            : "No recipes yet"}
      </h2>

      <p>
        {searching
          ? "Try another name or clear your filters."
          : favouritesOnly
            ? "Star recipes in this collection to find them here."
            : "Paste a recipe or link, or describe a dish to get started."}
      </p>

      {searching || favouritesOnly ? (
        <button
          type="button"
          className="button button-outline"
          onClick={onClear}
        >
          Clear filters
        </button>
      ) : (
        <Link to="/" className="button button-primary">
          Add a recipe <ArrowUpRight size={18} />
        </Link>
      )}
    </div>
  );
}
