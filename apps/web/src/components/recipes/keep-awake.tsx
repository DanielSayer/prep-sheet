import { Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function KeepAwake() {
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("off");

  useEffect(() => {
    if (!enabled || !supported) return;
    let disposed = false;
    let pending = false;
    let lock: WakeLockSentinel | undefined;

    const acquire = async () => {
      if (
        disposed ||
        pending ||
        (lock && !lock.released) ||
        document.visibilityState !== "visible"
      )
        return;
      pending = true;
      setStatus("pending");
      try {
        const acquired = await navigator.wakeLock.request("screen");
        if (disposed) {
          await acquired.release();
          return;
        }
        lock = acquired;
        setStatus(acquired.released ? "paused" : "active");
        acquired.addEventListener("release", () => {
          if (!disposed) setStatus("paused");
        });
      } catch {
        if (!disposed) {
          setStatus("error");
          setEnabled(false);
        }
      } finally {
        pending = false;
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => {});
    };
  }, [enabled, supported]);

  return (
    <>
      <button
        type="button"
        className="organise-action keep-awake"
        disabled={!supported}
        aria-pressed={enabled}
        aria-describedby="keep-awake-status"
        title={
          !supported
            ? "Keep awake isn't available in this browser"
            : status === "error"
              ? "Couldn't keep the screen awake. Try again."
              : enabled
                ? "Turn keep awake off"
                : "Keep screen awake"
        }
        onClick={() => {
          setStatus("off");
          setEnabled(!enabled);
        }}
      >
        <Sun size={17} aria-hidden="true" />
        {status === "active"
          ? "Screen awake"
          : status === "pending"
            ? "Turning on…"
            : status === "paused"
              ? "Awake paused"
              : status === "error"
                ? "Retry keep awake"
                : "Keep awake"}
      </button>
      <span id="keep-awake-status" className="sr-only" role="status">
        {!supported
          ? "Keep awake isn't available in this browser."
          : status === "active"
            ? "Screen will stay awake while you cook."
            : status === "pending"
              ? "Turning keep awake on…"
              : status === "paused"
                ? "Keep awake paused. It will retry when you return to this page."
                : status === "error"
                  ? "Couldn't keep the screen awake. Check your battery settings and try again."
                  : "Keep your screen on while this recipe is open."}
      </span>
    </>
  );
}
