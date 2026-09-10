import {
  type Connection,
  connectionSchema,
} from "@prep-sheet/auth/extension-contract";
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { z } from "zod";
import { prepSheetOrigin } from "../../lib/config";
import { Capture } from "./Capture";

const responseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), state: connectionSchema }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

export function App() {
  const [connection, setConnection] = useState<Connection>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const send = useCallback(
    async (kind: "status" | "connect" | "disconnect") => {
      setBusy(true);
      setError("");
      try {
        const response = responseSchema.parse(
          await browser.runtime.sendMessage({ kind }),
        );
        if (!response.ok) throw new Error(response.error);
        setConnection(response.state);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Couldn't connect. Please try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [],
  );
  useEffect(() => {
    void send("status");
  }, [send]);
  useEffect(() => {
    if (connection?.kind !== "connecting") return;
    const timer = setInterval(() => void send("status"), 1500);
    return () => clearInterval(timer);
  }, [connection?.kind, send]);
  return (
    <main>
      <p className="brand">Prep Sheet</p>
      <h1>
        {connection?.kind === "connected"
          ? "You're connected."
          : "Your recipes, within reach."}
      </h1>
      {connection?.kind === "connected" ? (
        <>
          <p className="account">
            <strong>{connection.account.name}</strong>
            <br />
            {connection.account.email}
          </p>
          <Capture />
          <a
            className="secondary"
            href={prepSheetOrigin}
            target="_blank"
            rel="noreferrer"
          >
            Open Prep Sheet <span aria-hidden="true">↗</span>
          </a>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void send("disconnect")}
            type="button"
          >
            Disconnect
          </button>
        </>
      ) : connection?.kind === "connecting" ? (
        <p role="status">
          Finish connecting in the Prep Sheet window. You can close this popup
          and reopen it afterwards.
        </p>
      ) : (
        <>
          <p>
            Connect your account to get ready to save recipes from your browser.
          </p>
          {connection?.kind === "disconnected" && connection.message && (
            <p role="status">{connection.message}</p>
          )}
          <button
            disabled={busy || !connection}
            onClick={() => void send("connect")}
            type="button"
          >
            {busy ? "Checking connection..." : "Connect to Prep Sheet"}
          </button>
        </>
      )}
      {connection?.kind !== "connected" && <Capture />}
      {error && (
        <>
          <p className="error" role="alert">
            {error}
          </p>
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={() => void send("status")}
          >
            Try again
          </button>
        </>
      )}
    </main>
  );
}
