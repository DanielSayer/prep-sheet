import { prepSheetOrigin } from "../../lib/config";

export function App() {
  return (
    <main>
      <p className="brand">Prep Sheet</p>
      <h1>A place for good recipes.</h1>
      <p>
        Saving from your browser is coming soon. Your recipes are ready to open
        in Prep Sheet.
      </p>
      <a href={prepSheetOrigin} target="_blank" rel="noreferrer">
        Open Prep Sheet <span aria-hidden="true">↗</span>
      </a>
    </main>
  );
}
