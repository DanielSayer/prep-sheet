import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ErrorNotice } from "@/components/feedback";
import { PlanCards, PricingFaq } from "@/components/plan-cards";
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
          <PlanCards
            trialEligible={plan.trialEligible && plan.tier === "free"}
            freeAction={
              <p className="plan-current">
                {plan.tier === "free"
                  ? "Your current plan"
                  : "Included with Pro"}
              </p>
            }
            proAction={
              plan.tier === "pro" ? (
                <p className="plan-current">
                  {plan.bucket === "trial"
                    ? "Your trial is active"
                    : "Your current plan"}
                </p>
              ) : (
                <button
                  type="button"
                  className="button button-primary"
                  disabled={busy || !plan.available}
                  onClick={() => checkout.mutate()}
                >
                  {checkout.isPending
                    ? "Opening checkout..."
                    : !plan.available
                      ? "Pro is coming soon"
                      : plan.trialEligible && plan.pricing.trial.days > 0
                        ? `Start ${plan.pricing.trial.days}-day free trial`
                        : "Get Pro"}
                </button>
              )
            }
          />
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
          <PricingFaq />
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
