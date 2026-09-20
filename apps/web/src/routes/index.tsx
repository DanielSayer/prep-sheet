import { createFileRoute, Link } from "@tanstack/react-router";
import { Hero } from "@/components/home/hero";
import { RecipeComposer } from "@/components/home/recipe-composer";
import { RecipeSheetPreview } from "@/components/home/recipe-sheet-preview";
import { PublicPlans } from "@/components/plan-cards";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({ ssr: false, component: Home });

function Home() {
  const { data: session, isPending } = authClient.useSession();
  return (
    <main id="main-content" className="home-page">
      <div className="home-entry">
        <Hero />
        <RecipeComposer />
      </div>
      <RecipeSheetPreview />
      {!isPending && !session && (
        <section className="home-plans" aria-labelledby="home-plans-title">
          <div className="pricing-heading">
            <p className="plan-eyebrow">Save it. Plan it. Cook it.</p>
            <h2 id="home-plans-title">Your recipes, ready for dinner.</h2>
            <p>
              Bring recipe links and notes into one cookbook. Plan the week,
              build a shopping list and follow along as you cook.
            </p>
          </div>
          <PublicPlans />
          <div className="pricing-links">
            <Link to="/pricing">Compare plans &amp; trial details</Link>
            <Link to="/privacy">Privacy policy</Link>
          </div>
        </section>
      )}
    </main>
  );
}
