import { useState } from "react";
import { browser } from "wxt/browser";
import {
  type CaptureResult,
  captureErrors,
  captureResultSchema,
} from "../../lib/capture-contract";

type State = { kind: "idle" } | { kind: "loading" } | CaptureResult;

export function Capture() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [selected, setSelected] = useState(0);
  async function capture() {
    setState({ kind: "loading" });
    setSelected(0);
    try {
      setState(
        captureResultSchema.parse(
          await browser.runtime.sendMessage({ kind: "capture" }),
        ),
      );
    } catch {
      setState({ kind: "error", code: "unavailable" });
    }
  }
  const recipe =
    state.kind === "captured" ? state.recipes[selected] : undefined;
  return (
    <section className="capture" aria-label="Capture recipe">
      <button
        type="button"
        disabled={state.kind === "loading"}
        onClick={() => void capture()}
      >
        {state.kind === "loading"
          ? "Reading recipe..."
          : state.kind === "idle"
            ? "Capture recipe"
            : "Capture again"}
      </button>
      {state.kind === "loading" && (
        <p role="status">Reading the page you have open.</p>
      )}
      {state.kind === "error" && (
        <p className="error" role="alert">
          {captureErrors[state.code]}
        </p>
      )}
      {state.kind === "captured" && (
        <>
          {state.recipes.length > 1 && (
            <fieldset>
              <legend>Choose a recipe</legend>
              {state.recipes.map((item, index) => (
                <label className="recipe-choice" key={`${index}-${item.title}`}>
                  <input
                    type="radio"
                    name="recipe"
                    checked={selected === index}
                    onChange={() => setSelected(index)}
                  />
                  <span>{item.title}</span>
                </label>
              ))}
            </fieldset>
          )}
          {recipe && (
            <div className="capture-preview">
              <h2>{recipe.title}</h2>
              <a
                className="source"
                href={state.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {new URL(state.sourceUrl).hostname}{" "}
                <span aria-hidden="true">↗</span>
              </a>
              <p className="capture-note" role="status">
                Captured on this device. Saving isn't available yet.
              </p>
              <details>
                <summary>Preview captured recipe</summary>
                <pre>{recipe.content}</pre>
              </details>
            </div>
          )}
        </>
      )}
    </section>
  );
}
