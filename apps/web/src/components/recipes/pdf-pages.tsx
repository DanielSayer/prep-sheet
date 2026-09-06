import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { ErrorNotice, LoadingState } from "@/components/feedback";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export function PdfPages({ url }: { url: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    const element = container.current;

    if (!element) return;

    const observer = new ResizeObserver(() =>
      setWidth(Math.min(760, element.clientWidth - 24)),
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="pdf-pages">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setPages(numPages)}
        loading={
          <LoadingState pending label="Opening your kitchen copy...">
            {null}
          </LoadingState>
        }
        error={
          <ErrorNotice message="The preview couldn't load. You can still download the PDF above." />
        }
      >
        {Array.from({ length: pages }, (_, index) => (
          <Page key={index + 1} pageNumber={index + 1} width={width} />
        ))}
      </Document>
    </div>
  );
}
