import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";

export function ReportForm() {
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
        Describe what went wrong and include any error message. Leave out
        passwords, sign-in codes and private recipes.
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
          Report saved for review. Reference: {report.data.id}.
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
