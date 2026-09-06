import { Download, ExternalLink } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { ErrorNotice, LoadingState } from "@/components/feedback";

const PdfPages = lazy(() =>
  import("./pdf-pages").then((module) => ({ default: module.PdfPages })),
);

export function PdfPreview({
  id,
  title,
  version,
}: {
  id: string;
  title: string;
  version: string;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let blobUrl = "";
    setUrl("");
    setError("");
    fetch(
      `/api/recipes/${id}/pdf?v=${encodeURIComponent(version)}&attempt=${attempt}`,
      {
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Couldn't make your PDF. Please try again.");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        blobUrl = URL.createObjectURL(blob);
        setUrl(blobUrl);
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => {
      controller.abort();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [id, version, attempt]);
  return (
    <section className="pdf-section" aria-label="Recipe PDF">
      <div className="pdf-toolbar">
        <span>YOUR KITCHEN COPY</span>
        {url && (
          <div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-button"
            >
              Open PDF <ExternalLink size={16} />
            </a>
            <a
              href={url}
              download={`${title.replace(/[^a-z0-9 -]/gi, "").slice(0, 80) || "recipe"}.pdf`}
              className="button button-small button-outline"
            >
              <Download size={16} /> Download
            </a>
          </div>
        )}
      </div>
      <ErrorNotice message={error} retry={() => setAttempt(attempt + 1)} />
      <LoadingState
        pending={!url && !error}
        label="Putting your kitchen copy together..."
      >
        {url && (
          <Suspense
            fallback={
              <LoadingState pending label="Opening your kitchen copy...">
                {null}
              </LoadingState>
            }
          >
            <PdfPages url={url} />
          </Suspense>
        )}
      </LoadingState>
    </section>
  );
}
