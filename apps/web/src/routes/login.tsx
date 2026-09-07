import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CookingPot } from "lucide-react";
import { useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: Login,
});

function Login() {
  const { error: callbackError } = Route.useSearch();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(() =>
    callbackError === "access_denied"
      ? "Discord sign-in was cancelled. You can try again when you're ready."
      : callbackError
        ? "We couldn't finish signing in with Discord. Please try again. If it keeps failing, the sign-in settings may need checking."
        : "",
  );

  async function signIn() {
    if (pending) return;
    setPending(true);
    setError("");

    try {
      const result = await authClient.signIn.social({
        provider: "discord",
        callbackURL: "/",
        errorCallbackURL: "/login",
      });

      if (result.error)
        throw new Error(
          "Discord sign-in isn't ready. Check the Discord credentials and callback URL in your server settings.",
        );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Couldn't connect to Discord. Please try again.",
      );

      setPending(false);
    }
  }

  return (
    <main id="main-content" className="login-page">
      <div className="login-card">
        <span className="login-illustration">
          <CookingPot size={58} />
        </span>

        <h1>
          Your recipes.
          <br />
          One happy home.
        </h1>

        <p>
          Sign in to save your favourites and start your own little cookbook.
        </p>

        <button
          type="button"
          className="button button-discord"
          onClick={signIn}
          disabled={pending}
        >
          {pending ? "Connecting to Discord..." : "Continue with Discord"}
          <ArrowRight size={19} />
        </button>

        <ErrorNotice message={error} />
        <p className="small-note">
          Just a sign-in. We won't post to your servers.
        </p>

        <Link to="/" className="text-button">
          Back to the kitchen
        </Link>
      </div>
    </main>
  );
}
