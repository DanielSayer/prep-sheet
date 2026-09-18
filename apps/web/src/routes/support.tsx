import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { SupportContact } from "@/components/support-contact";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/support")({ component: Support });

function Support() {
  const { data: session, isPending } = authClient.useSession();
  return (
    <main id="main-content" className="page-width help-page">
      <div className="page-heading">
        <div>
          <h1>
            Support<span className="title-dot">.</span>
          </h1>
          <p>Something went wrong? Tell us what happened.</p>
        </div>
      </div>
      <section className="help-section">
        <h2>Get help</h2>
        <SupportContact />
        <p>
          Discord manages your password and sign-in email. Prep Sheet account
          deletion is available in <Link to="/settings">account settings</Link>.
        </p>
      </section>
      {isPending ? (
        <p role="status">Checking sign-in...</p>
      ) : session ? (
        <ReportForm />
      ) : (
        <section className="help-section">
          <h2>Report a problem</h2>
          <p>Sign in to send a report linked to your Prep Sheet account.</p>
          <Link to="/login" className="button button-primary">
            Sign in with Discord
          </Link>
        </section>
      )}
      <p>
        <Link to="/privacy" className="text-button">
          How we handle your information
        </Link>
      </p>
    </main>
  );
}

function ReportForm() {
  const trpc = useTRPC();
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const reports = useQuery(trpc.support.reports.queryOptions());
  const report = useMutation(
    trpc.support.report.mutationOptions({
      onSuccess: () => {
        setMessage("");
        void client.invalidateQueries({
          queryKey: trpc.support.reports.queryKey(),
        });
      },
    }),
  );
  return (
    <section className="help-section">
      <h2>Report a problem</h2>
      <p>
        Include what you were trying to do, what happened and any error message.
        Do not include passwords, sign-in codes or private recipe content.
        Reports are reviewed manually.
      </p>
      <form
        className="help-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!report.isPending) report.mutate({ message });
        }}
      >
        <label htmlFor="support-message">What happened?</label>
        <textarea
          id="support-message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={report.isPending}
        />
        <ErrorNotice
          message={
            report.error
              ? "Couldn't send your report. Your text is still here. Please try again. If you have sent five reports this hour, wait before retrying."
              : undefined
          }
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={report.isPending || message.trim().length < 10}
        >
          {report.isPending ? "Sending..." : "Send report"}
        </button>
      </form>
      {report.isSuccess && (
        <p role="status">
          Report received. Reference: {report.data.id}. It is saved for manual
          review.
        </p>
      )}
      <details className="help-history">
        <summary>Your recent reports</summary>
        <ErrorNotice
          message={reports.error ? "Couldn't load your reports." : undefined}
          retry={() => void reports.refetch()}
        />
        {reports.isPending ? (
          <p role="status">Loading reports...</p>
        ) : reports.data?.length === 0 ? (
          <p>No reports yet.</p>
        ) : (
          <ul>
            {reports.data?.map((item) => (
              <li key={item.id}>
                <p>{item.message}</p>
                <small>
                  Received {new Date(item.createdAt).toLocaleDateString()} ·
                  Reference: {item.id}
                </small>
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}
