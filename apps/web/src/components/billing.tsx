import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ErrorNotice } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";

export function Billing() {
  const trpc = useTRPC();
  const client = useQueryClient();
  const status = useQuery(trpc.billing.status.queryOptions());
  const refresh = useMutation(
    trpc.billing.refresh.mutationOptions({
      onSuccess: () =>
        client.invalidateQueries({ queryKey: trpc.billing.status.queryKey() }),
    }),
  );
  const refreshed = useRef(false);
  useEffect(() => {
    if (status.data?.available && !refreshed.current) {
      refreshed.current = true;
      refresh.mutate();
    }
  }, [status.data?.available, refresh.mutate]);
  const redirect = ({ url }: { url: string }) => window.location.assign(url);
  const checkout = useMutation(
    trpc.billing.checkout.mutationOptions({ onSuccess: redirect }),
  );
  const portal = useMutation(
    trpc.billing.portal.mutationOptions({ onSuccess: redirect }),
  );
  const plan = status.data;
  const busy = checkout.isPending || portal.isPending || refresh.isPending;
  return (
    <section
      className="help-section billing-section"
      aria-labelledby="billing-heading"
    >
      <h2 id="billing-heading">Your plan</h2>
      {status.isPending && <p role="status">Loading your plan...</p>}
      <ErrorNotice
        message={status.error?.message}
        retry={() => void status.refetch()}
      />
      {plan && (
        <>
          <div className="billing-summary">
            <strong>
              {plan.tier === "pro"
                ? plan.bucket === "trial"
                  ? "Pro trial"
                  : "Pro"
                : "Free"}
            </strong>
            <p>
              {plan.saved}{" "}
              {plan.recipes === null
                ? "recipes saved"
                : `of ${plan.recipes} recipes saved`}
            </p>
            {plan.recipes !== null && plan.saved >= plan.recipes && (
              <p className="muted">
                Your recipes are safe. Upgrade or remove a recipe before saving
                another.
              </p>
            )}
            <p>
              {Math.max(0, plan.credits - plan.used)} of {plan.credits} AI
              credits left
              {plan.bucket === "free"
                ? " for your account"
                : plan.bucket === "trial"
                  ? " for your trial"
                  : " this month"}
              .
            </p>
            {plan.resetsAt && (
              <p className="muted">
                {plan.bucket === "trial" ? "Trial ends" : "Credits reset"}{" "}
                {new Date(plan.resetsAt).toLocaleDateString()}.
              </p>
            )}
            {plan.cancelAtPeriodEnd && plan.validUntil && (
              <p>
                Pro ends {new Date(plan.validUntil).toLocaleDateString()}. Your
                recipes stay readable and exportable.
              </p>
            )}
          </div>
          {plan.tier === "free" && (
            <div className="billing-offer">
              <h3>Grow your cookbook with Pro</h3>
              <ul>
                <li>
                  {plan.pricing.pro.recipes === null
                    ? "Unlimited saved recipes"
                    : `Save up to ${plan.pricing.pro.recipes} recipes`}
                </li>
                <li>
                  {plan.pricing.pro.aiCredits} AI imports or generated recipes
                  each month
                </li>
                {plan.pricing.pro.createHousehold && (
                  <li>Create a shared household. Anyone can join.</li>
                )}
              </ul>
              {plan.trialEligible && plan.pricing.trial.days > 0 && (
                <p>
                  Try Pro for {plan.pricing.trial.days} days with{" "}
                  {plan.pricing.trial.aiCredits} AI credits total.
                </p>
              )}
              <p className="muted">
                See the price and renewal terms at checkout. Discount codes are
                welcome.
              </p>
              <button
                type="button"
                className="button button-primary"
                disabled={busy || !plan.available}
                onClick={() => checkout.mutate()}
              >
                {checkout.isPending ? "Opening checkout..." : "Upgrade to Pro"}
              </button>
              {!plan.available && (
                <p className="muted">Pro checkout is coming soon.</p>
              )}
            </div>
          )}
          <div className="billing-actions">
            {plan.hasCustomer && (
              <button
                type="button"
                className="button button-outline"
                disabled={busy || !plan.available}
                onClick={() => portal.mutate()}
              >
                {portal.isPending
                  ? "Opening billing..."
                  : "Manage subscription"}
              </button>
            )}
            {plan.available && (
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => refresh.mutate()}
              >
                {refresh.isPending ? "Checking plan..." : "Refresh plan"}
              </button>
            )}
          </div>
          <p className="muted">
            AI credits cover attempts once processing starts. Deleting recipes
            does not restore credits. Pro credits reset on the first of each
            month, UTC.
          </p>
        </>
      )}
      <ErrorNotice
        message={
          checkout.error?.message ??
          portal.error?.message ??
          refresh.error?.message
        }
      />
    </section>
  );
}
