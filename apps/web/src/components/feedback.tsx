import { AlertCircle, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingState({
  pending,
  label = "Loading your recipes...",
  children,
}: {
  pending: boolean;
  label?: string;
  children: ReactNode;
}) {
  if (pending)
    return (
      <div className="loading-state" role="status">
        <LoaderCircle className="spin" size={28} />
        <p>{label}</p>
      </div>
    );

  return children;
}

export function ErrorNotice({
  message,
  retry,
}: {
  message?: string;
  retry?: () => void;
}) {
  if (!message) return null;

  return (
    <div className="error-notice" role="alert">
      <AlertCircle size={20} />
      <div>
        <p>{message}</p>
        {retry && (
          <button className="text-button" type="button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
