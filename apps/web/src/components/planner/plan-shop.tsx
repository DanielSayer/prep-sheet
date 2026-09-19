import {
  type Coverage,
  coverageInput,
  type Meal,
} from "@prep-sheet/db/meal-planner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBasket } from "lucide-react";
import { useState } from "react";
import { useTRPC } from "@/utils/trpc";
import { ErrorNotice, LoadingState } from "../feedback";
import { OrganiseDialog } from "../recipes/organise-dialog";
import { addDays, dateLabel, localDate } from "./dates";

export function mealTitle(meal: Meal, meals: Meal[]) {
  if (meal.kind === "recipe") return meal.title;
  if (meal.kind === "out") return meal.description || "Eating out";
  const source = meals.find((entry) => entry.id === meal.sourceId);
  return source?.kind === "recipe" ? `${source.title} leftovers` : "Leftovers";
}

export function TripSummary() {
  const trpc = useTRPC();
  const query = useQuery(trpc.planner.get.queryOptions());
  const [review, setReview] = useState(false);
  const trip = query.data?.trip;
  if (query.isError)
    return (
      <ErrorNotice
        message={query.error.message}
        retry={() => void query.refetch()}
      />
    );
  if (!trip || !query.data) return null;
  return (
    <>
      <section
        className={`meal-trip-summary ${query.data.stale ? "meal-trip-stale" : ""}`}
        aria-label="Planned shopping trip"
      >
        <details className="meal-trip-details">
          <summary>Shop {dateLabel(trip.shoppingDate)}</summary>
          <p>
            Meals {dateLabel(trip.start)} to {dateLabel(trip.end)}
          </p>
          {query.data.stale && (
            <p className="meal-warning" role="status">
              Planned meals changed.
            </p>
          )}
        </details>
        <div className="meal-trip-actions">
          <Link className="text-button" to="/planner">
            Meal plan →
          </Link>
          {query.data.stale && (
            <button
              className="button button-small button-primary"
              type="button"
              onClick={() => setReview(true)}
            >
              Review changes
            </button>
          )}
        </div>
      </section>
      {review && (
        <PlanShop
          initial={trip}
          replace={false}
          onClose={() => setReview(false)}
        />
      )}
    </>
  );
}

export function PlanShop({
  initial,
  replace,
  onClose,
}: {
  initial?: Coverage;
  replace: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const client = useQueryClient();
  const navigate = useNavigate();
  const planner = useQuery(trpc.planner.get.queryOptions());
  const [coverage, setCoverage] = useState<Coverage>(
    initial ?? {
      shoppingDate: localDate(),
      start: localDate(),
      end: addDays(localDate(), 6),
    },
  );
  const [reviewed, setReviewed] = useState<Coverage | null>(null);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const preview = useQuery(
    trpc.planner.preview.queryOptions(
      { coverage: reviewed ?? coverage, replace },
      { enabled: reviewed !== null, staleTime: 0 },
    ),
  );
  const apply = useMutation(
    trpc.planner.applyTrip.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          client.invalidateQueries({ queryKey: trpc.planner.pathKey() }),
          client.invalidateQueries({ queryKey: trpc.shopping.pathKey() }),
        ]);
        onClose();
        await navigate({ to: "/shopping/generated" });
      },
    }),
  );
  const set = (patch: Partial<Coverage>) => {
    setCoverage((current) => ({ ...current, ...patch }));
    setReviewed(null);
    apply.reset();
    setConfirmed(false);
  };
  const needsConfirmation =
    replace &&
    (Boolean(planner.data?.trip) ||
      Boolean(
        preview.data?.changes.some((change) => change.kind === "remove"),
      ));
  return (
    <OrganiseDialog
      title={replace ? "Plan shop" : "Update shopping trip"}
      className="meal-dialog meal-shop-dialog"
      onClose={() => {
        if (!apply.isPending) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = coverageInput.safeParse(coverage);
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? "Check the dates.");
            return;
          }
          setError("");
          setReviewed(parsed.data);
        }}
      >
        <fieldset disabled={apply.isPending} className="meal-form">
          <label className="shopping-field">
            Shopping date
            <input
              type="date"
              required
              min="2000-01-01"
              max="2100-12-31"
              value={coverage.shoppingDate}
              onChange={(event) => set({ shoppingDate: event.target.value })}
            />
          </label>
          <div className="meal-form-grid">
            <label className="shopping-field">
              First meal date
              <input
                type="date"
                required
                min={coverage.shoppingDate}
                max="2100-12-31"
                value={coverage.start}
                onChange={(event) => set({ start: event.target.value })}
              />
            </label>
            <label className="shopping-field">
              Last meal date
              <input
                type="date"
                required
                min={coverage.start}
                max="2100-12-31"
                value={coverage.end}
                onChange={(event) => set({ end: event.target.value })}
              />
            </label>
          </div>
          <ErrorNotice
            message={error || planner.error?.message}
            retry={() => void planner.refetch()}
          />
          {!reviewed && (
            <div className="organise-dialog-footer">
              <button
                type="button"
                className="button button-outline"
                onClick={onClose}
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit">
                Preview shopping list
              </button>
            </div>
          )}
        </fieldset>
      </form>
      {reviewed && (
        <div className="meal-form">
          <LoadingState
            pending={preview.isPending}
            label="Reviewing meals and ingredients..."
          >
            <ErrorNotice
              message={preview.error?.message}
              retry={() => void preview.refetch()}
            />
            {preview.data && !preview.isError && (
              <>
                <section className="meal-review-section">
                  <h3>Meals covered</h3>
                  {!preview.data.meals.length && (
                    <p>No meals planned. You can still shop for groceries.</p>
                  )}
                  <ul className="meal-review-meals">
                    {preview.data.meals.map((meal) => (
                      <li key={meal.id}>
                        <span>
                          {dateLabel(meal.date)}
                          {meal.slot ? ` · ${meal.slot}` : ""}
                        </span>
                        <strong>
                          {mealTitle(meal, planner.data?.meals ?? [])}
                        </strong>
                        <small>
                          {meal.kind === "recipe"
                            ? `Cook ${meal.cook} servings`
                            : "No ingredients added"}
                        </small>
                      </li>
                    ))}
                  </ul>
                </section>
                {preview.data.issues.map((issue) => (
                  <p
                    key={issue.id + issue.message}
                    className="meal-warning"
                    role="alert"
                  >
                    {issue.message}
                  </p>
                ))}
                <section className="meal-review-section">
                  <h3>Ingredient changes</h3>
                  <p className="muted">
                    Keeps other groceries and quantities already bought or at
                    home.
                  </p>
                  {!preview.data.changes.length && (
                    <p>No ingredient changes needed.</p>
                  )}
                  <ul className="meal-changes">
                    {preview.data.changes.map((change, index) => (
                      <li key={`${index}:${change.title}`}>
                        <span
                          className={`meal-change-kind meal-change-${change.kind}`}
                        >
                          {change.kind === "keep"
                            ? "Keep"
                            : change.kind === "add"
                              ? "Add"
                              : change.kind === "remove"
                                ? "Remove"
                                : "Change"}
                        </span>
                        <div>
                          <strong>{change.title}</strong>
                          {change.before && <p>{change.before}</p>}
                          {change.after && (
                            <p>
                              {change.kind === "change" ? "Now: " : ""}
                              {change.after}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                {!!preview.data.warnings.length && (
                  <div className="meal-warning">
                    <strong>Check these quantities</strong>
                    <ul>
                      {preview.data.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {needsConfirmation && (
                  <label className="meal-replace-confirm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={apply.isPending}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    <span>
                      Replace the active trip and its recipe ingredients,
                      including bought recipe items. Keep other groceries.
                    </span>
                  </label>
                )}
                <ErrorNotice
                  message={apply.error?.message}
                  retry={() => {
                    apply.reset();
                    void preview.refetch();
                  }}
                />
                <div className="organise-dialog-footer">
                  <button
                    type="button"
                    disabled={apply.isPending}
                    className="button button-outline"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={
                      apply.isPending ||
                      preview.isFetching ||
                      preview.data.issues.length > 0 ||
                      (needsConfirmation && !confirmed)
                    }
                    onClick={() => {
                      if (preview.data)
                        apply.mutate({
                          coverage: reviewed,
                          replace,
                          token: preview.data.token,
                        });
                    }}
                  >
                    <ShoppingBasket size={17} />
                    {apply.isPending
                      ? "Preparing..."
                      : replace
                        ? "Generate shopping list"
                        : "Apply changes"}
                  </button>
                </div>
              </>
            )}
          </LoadingState>
        </div>
      )}
    </OrganiseDialog>
  );
}
