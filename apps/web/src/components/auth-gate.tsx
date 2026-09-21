import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { authClient } from "../lib/auth-client";
import { ErrorNotice, LoadingState } from "./feedback";

// The shared client session gates rendering. API procedures still authenticate
// each request, without making navigation wait for a second session lookup.
export function AuthGate({ children }: { children: ReactNode }) {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  if (session) return children;

  return (
    <main id="main-content" className="page-width">
      {isPending ? (
        <LoadingState pending label="Loading your account...">
          {null}
        </LoadingState>
      ) : error ? (
        <ErrorNotice
          message="Couldn't load your account. Please try again."
          retry={() => void refetch()}
        />
      ) : (
        <Navigate to="/login" replace />
      )}
    </main>
  );
}
