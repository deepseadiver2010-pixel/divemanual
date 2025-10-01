import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---- PDF.js worker: use a bundled/relative worker to avoid CORS/version drift
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdf.worker.min.mjs",
  // resolves to node_modules/pdfjs-dist/build/pdf.worker.min.mjs at build time
  // ensure next.config.js -> transpilePackages: ["react-pdf","pdfjs-dist"] if needed
  import.meta.url
).toString();

interface PDFViewerProps {
  pdfUrl: string;
  onPageChange?: (pageNumber: number) => void;
  targetPage?: number;
  targetParagraph?: string;
}

export const PDFViewer = ({
  pdfUrl,
  onPageChange,
  targetPage,
  targetParagraph,
}: PDFViewerProps) => {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [searchText, setSearchText] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Observe which page is in view (relative to the scroll container)
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // pick the entry with the largest intersection ratio > 0
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (best?.isIntersecting) {
          const numAttr = (best.target as HTMLElement).dataset["pnum"];
          if (numAttr) {
            const visible = parseInt(numAttr, 10);
            if (visible !== currentPage) {
              setCurrentPage(visible);
              onPageChange?.(visible);
            }
          }
        }
      },
      { root, threshold: [0.1, 0.25, 0.5, 0.75] }
    );

    Object.entries(pageRefs.current).forEach(([k, el]) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages, onPageChange, currentPage]);

  // Scroll to target page when available
  useEffect(() => {
    if (!targetPage || targetPage < 1 || targetPage > numPages) return;
    const el = pageRefs.current[targetPage];
    if (el && scrollRef.current) {
      const container = scrollRef.current;
      const top = el.offsetTop; // relative to scroll container
      container.scrollTo({ top: top - 16, behavior: "smooth" });
    }
  }, [targetPage, numPages]);

  // (Temporary) rough paragraph find using window.find
  useEffect(() => {
    if (!targetParagraph || !targetPage) return;
    // delay to ensure page text layer is rendered
    const id = setTimeout(() => {
      const win = window as any;
      const terms = targetParagraph.replace(/[-.]/g, " ");
      if (win.find) win.find(terms, false, false, true, false, true, false);
    }, 600);
    return () => clearTimeout(id);
  }, [targetParagraph, targetPage]);

  const onLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const scrollToPage = (pageNum: number) => {
    const el = pageRefs.current[pageNum];
    if (el && scrollRef.current) {
      const container = scrollRef.current;
      container.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b bg-background p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="whitespace-nowrap text-sm">
            Page {currentPage} of {numPages || "…"}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
            disabled={!numPages || currentPage >= numPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut} aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="whitespace-nowrap text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="icon" onClick={handleZoomIn} aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Find in document…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchText) {
                const win = window as any;
                if (win.find) win.find(searchText, false, false, true, false, true, false);
              }
            }}
            className="w-64"
          />
        </div>
      </div>

      {/* Single, explicit scroll container to keep centering correct */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-muted/30 py-6"
        // optional: role and aria for better a11y
        role="region"
        aria-label="PDF document viewer"
      >
        <div className="mx-auto w-full max-w-5xl px-4 lg:px-8">
          <Document
            file={pdfUrl}
            onLoadSuccess={onLoadSuccess}
            loading={
              <div className="flex h-96 items-center justify-center">
                <div className="text-muted-foreground">Loading PDF…</div>
              </div>
            }
            error={
              <div className="flex h-96 items-center justify-center">
                <div className="text-destructive">Failed to load PDF</div>
              </div>
            }
          >
            {Array.from({ length: numPages }, (_, i) => {
              const pageNumber = i + 1;
              return (
                <div
                  key={`page_${pageNumber}`}
                  ref={(el) => (pageRefs.current[pageNumber] = el)}
                  data-pnum={pageNumber}
                  className="mb-6 rounded bg-white shadow"
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                    className="bg-white"
                  />
                </div>
              );
            })}
          </Document>
        </div>
      </div>
    </div>
  );
};
