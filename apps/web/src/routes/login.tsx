import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CookingPot } from "lucide-react";
import { useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function signIn() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "discord",
        callbackURL: "/",
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
        <span className="eyebrow">PULL UP A CHAIR</span>
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
