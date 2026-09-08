import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen } from "lucide-react";

export function EmptyCollection({
  searching,
  favouritesOnly,
  tagged = false,
  onClear,
}: {
  searching: boolean;
  favouritesOnly: boolean;
  tagged?: boolean;
  onClear: () => void;
}) {
  return (
    <div className="empty-collection">
      <span className="empty-icon">
        <BookOpen size={46} />
      </span>

      <h2>
        {tagged
          ? "No recipes match these tags"
          : searching
            ? "No recipes by that name"
            : favouritesOnly
              ? "No favourites yet"
              : "No recipes yet"}
      </h2>

      <p>
        {tagged
          ? "Try fewer tags or clear your filters."
          : searching
            ? "Try another name or clear your filters."
            : favouritesOnly
              ? "Star recipes in this collection to find them here."
              : "Paste a recipe or link, or describe a dish to get started."}
      </p>

      {searching || favouritesOnly || tagged ? (
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
