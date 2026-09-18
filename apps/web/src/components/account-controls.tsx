import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";

export function AccountControls() {
  const trpc = useTRPC();
  const client = useQueryClient();
  const deletion = useQuery(trpc.support.deletion.queryOptions());
  const [confirmation, setConfirmation] = useState("");
  const refresh = async () => {
    setConfirmation("");
    await client.invalidateQueries({
      queryKey: trpc.support.deletion.queryKey(),
    });
  };
  const request = useMutation(
    trpc.support.requestDeletion.mutationOptions({ onSuccess: refresh }),
  );
  const cancel = useMutation(
    trpc.support.cancelDeletion.mutationOptions({ onSuccess: refresh }),
  );
  const busy = request.isPending || cancel.isPending;
  return (
    <section className="help-section" aria-labelledby="account-heading">
      <h2 id="account-heading">Account and support</h2>
      <p>
        You sign in through Discord. Manage your password, sign-in email and
        security settings in Discord.
      </p>
      <div className="help-actions">
        <Link to="/privacy" className="text-button">
          Privacy
        </Link>
        <Link to="/support" className="text-button">
          Support / report a problem
        </Link>
      </div>
      <details className="account-deletion">
        <summary>Request account deletion</summary>
        <p>
          This is a manual review request. Your account stays active until
          deletion is completed. You can cancel while it is pending. Your
          Discord account is unaffected.
        </p>
        <ul>
          <li>
            Your personal recipes, tags, favourites, ratings, cooking history,
            shopping lists, meal plans, imports and support reports are removed
            from the live database.
          </li>
          <li>
            Your sessions, extension connections and group memberships are
            removed.
          </li>
          <li>
            Shared recipes stay in surviving groups with your account link
            removed. Copies saved by others remain. Review any personal details
            in shared recipe text first.
          </li>
          <li>
            Transfer groups you own or explicitly delete them before deletion
            can be completed. Deleting a group removes its recipes for everyone.
          </li>
        </ul>
        <p>
          Clear this site's browser data on your devices to remove local drafts
          and preferences. <Link to="/privacy">Read the privacy page</Link> for
          more detail.
        </p>
        {deletion.isPending && <p role="status">Loading account details...</p>}
        <ErrorNotice
          message={
            deletion.error ? "Couldn't load your deletion request." : undefined
          }
          retry={() => void deletion.refetch()}
        />
        {deletion.data && (
          <>
            {deletion.data.ownedGroups.length > 0 && (
              <div className="account-group-notice">
                <strong>Groups to resolve before deletion</strong>
                <ul>
                  {deletion.data.ownedGroups.map((item) => (
                    <li key={item.id}>{item.name}</li>
                  ))}
                </ul>
                <Link to="/groups" className="text-button">
                  Manage groups
                </Link>
                <p>
                  You can submit a request now, but these groups must be
                  resolved before it is completed.
                </p>
              </div>
            )}
            {deletion.data.request ? (
              <div role="status">
                <p>
                  Deletion requested on{" "}
                  {new Date(
                    deletion.data.request.createdAt,
                  ).toLocaleDateString()}
                  . Awaiting manual review.
                </p>
                <p>Reference: {deletion.data.request.id}</p>
                <button
                  type="button"
                  className="button button-outline"
                  disabled={busy}
                  onClick={() => cancel.mutate()}
                >
                  {cancel.isPending
                    ? "Cancelling..."
                    : "Cancel deletion request"}
                </button>
              </div>
            ) : (
              <form
                className="help-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (confirmation === "DELETE" && !busy)
                    request.mutate({ confirmation: "DELETE" });
                }}
              >
                <label htmlFor="delete-confirmation">
                  Type DELETE to request deletion
                </label>
                <input
                  id="delete-confirmation"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={busy}
                />
                <button
                  type="submit"
                  className="button button-outline"
                  disabled={confirmation !== "DELETE" || busy}
                >
                  {request.isPending
                    ? "Submitting..."
                    : "Submit deletion request"}
                </button>
              </form>
            )}
          </>
        )}
        <ErrorNotice
          message={
            request.error || cancel.error
              ? "Couldn't update your request. Please try again."
              : undefined
          }
        />
      </details>
    </section>
  );
}
