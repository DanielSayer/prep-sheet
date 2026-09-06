import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { ErrorNotice } from "@/components/feedback";

export function ComposerFeedback({
  pending,
  error,
  saved,
}: {
  pending: boolean;
  error?: string;
  saved?: { id: string; title: string };
}) {
  return (
    <>
      {pending && (
        <div className="import-progress" role="status">
          <span className="progress-track">
            <span />
          </span>
          <p>
            Reading, organising and saving your recipe. This can take a minute.
          </p>
        </div>
      )}
      <ErrorNotice message={error} />
      {saved && (
        <div className="save-success" role="status">
          <span className="success-icon">
            <Check size={23} />
          </span>
          <div>
            <strong>Added to your collection!</strong>
            <p>{saved.title}</p>
          </div>
          <Link
            className="text-button"
            to="/recipes/$recipeId"
            params={{ recipeId: saved.id }}
          >
            Open recipe <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </>
  );
}
