import { createFileRoute } from "@tanstack/react-router";
import { PricingFaq, PublicPlans } from "@/components/plan-cards";

export const Route = createFileRoute("/pricing")({ component: Pricing });

function Pricing() {
  return (
    <main id="main-content" className="page-width pricing-page">
      <div className="pricing-heading">
        <p className="plan-eyebrow">Plans &amp; pricing</p>
        <h1>A home for your recipes.</h1>
        <p>
          Start with your favourites for free. Try Pro when you want room for
          more.
        </p>
      </div>
      <section aria-label="Compare plans">
        <h2 className="sr-only">Compare Free and Pro</h2>
        <PublicPlans />
      </section>
      <PricingFaq />
    </main>
  );
}
