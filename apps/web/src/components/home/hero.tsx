import { pricing } from "@prep-sheet/api/billing/policy";
import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export function Hero() {
  const { data: session, isPending } = authClient.useSession();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title">
        Big ideas.
        <br />
        <span>Good dinners.</span>
      </h1>
      <p>
        The recipe in your notes. The link a friend sent. Give them a place in
        your kitchen.
      </p>
      {!isPending && !session && (
        <Link to="/pricing" className="hero-pricing-link">
          Start free. Explore Pro and its {pricing.trial.days}-day free trial →
        </Link>
      )}
    </section>
  );
}
