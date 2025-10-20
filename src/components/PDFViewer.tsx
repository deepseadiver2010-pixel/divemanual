// src/components/PDFViewer.tsx
import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, AlertCircle } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBoundary } from "./ErrorBoundary";

// Worker pinned to installed pdfjs-dist
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
  pdfUrl: string;
  onPageChange?: (pageNumber: number) => void;
  targetPage?: number;
  targetParagraph?: string;
}

type PageDims = { w: number; h: number };

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
  const [pageDims, setPageDims] = useState<Record<number, PageDims>>({});
  const [docProxy, setDocProxy] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prefetched = useRef<Set<number>>(new Set());

  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => pageDims[index + 1]?.h ?? 1100,
    overscan: 6,
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (el) => el?.getBoundingClientRect().height
        : undefined,
  });

  // Track current page
  useEffect(() => {
    const items = rowVirtualizer.getVirtualItems();
    if (items.length) {
      const mid = items[Math.floor(items.length / 2)];
      const p = mid.index + 1;
      if (p !== currentPage) {
        setCurrentPage(p);
        onPageChange?.(p);
      }
    }
  }, [rowVirtualizer.getVirtualItems(), onPageChange]);

  // Deep-link scroll
  useEffect(() => {
    if (!targetPage || targetPage < 1 || targetPage > numPages) return;
    rowVirtualizer.scrollToIndex(targetPage - 1, { align: "start", behavior: "smooth" });
  }, [targetPage, numPages, rowVirtualizer]);

  // Temporary find
  useEffect(() => {
    if (!targetParagraph || !targetPage) return;
    const id = setTimeout(() => {
      const win = window as any;
      const terms = targetParagraph.replace(/[-.]/g, " ");
      if (win.find) win.find(terms, false, false, true, false, true, false);
    }, 600);
    return () => clearTimeout(id);
  }, [targetParagraph, targetPage]);

  // Remeasure on zoom
  useEffect(() => {
    if (numPages > 0) {
      rowVirtualizer.measure();
      setPageDims({});
      prefetched.current.clear();
    }
  }, [scale, numPages]);

  // Prefetch operator lists for images/fonts for current window (±3)
  useEffect(() => {
    if (!docProxy || numPages === 0) return;
    const start = Math.max(1, currentPage - 3);
    const end = Math.min(numPages, currentPage + 3);

    for (let p = start; p <= end; p++) {
      if (prefetched.current.has(p)) continue;
      prefetched.current.add(p);
      docProxy
        .getPage(p)
        .then((page: any) => page.getOperatorList())
        .catch(() => {
          prefetched.current.delete(p);
        });
    }
  }, [docProxy, currentPage, numPages]);

  const onDocLoad = (pdf: any) => {
    setDocProxy(pdf);
    setNumPages(pdf.numPages);
    prefetched.current.clear();
  };

  const onLoadError = (err: any) => {
    console.error("PDF Document load error:", err);
  };

  const scrollToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= numPages) {
      rowVirtualizer.scrollToIndex(pageNum - 1, { align: "start", behavior: "smooth" });
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b bg-background p-4 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => scrollToPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="whitespace-nowrap text-sm">Page {currentPage} of {numPages || "…"}</span>
          <Button variant="outline" size="icon" onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))} disabled={!numPages || currentPage >= numPages} aria-label="Next page">
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

      {/* Virtualized scroll container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-muted/30 py-6"
        role="region"
        aria-label="PDF document viewer"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <div className="w-full">
          <div className="flex justify-center" style={{ padding: 0 }}>
            <ErrorBoundary
              resetKeys={[pdfUrl]}
              fallback={
                <div className="flex h-96 items-center justify-center">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">PDF Viewer Error</h3>
                      <p className="text-sm text-muted-foreground max-w-md">The PDF viewer encountered an error. Please refresh the page or try again later.</p>
                    </div>
                  </div>
                </div>
              }
              onError={(error) => console.error("PDF Viewer Error:", error)}
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocLoad}
                onLoadError={onLoadError}
                loading={<div className="flex h-96 items-center justify-center"><div className="text-muted-foreground">Loading PDF…</div></div>}
                error={<div className="flex h-96 items-center justify-center"><div className="text-destructive">Failed to load PDF</div></div>}
              >
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const pageNumber = virtualRow.index + 1;
                    const dims = pageDims[pageNumber];
                    const w = dims ? Math.round(dims.w) : undefined;

                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          transform: `translate3d(0, ${virtualRow.start}px, 0)`,
                          display: "flex",
                          justifyContent: "center",
                        }}
                        className="mb-6"
                      >
                        <div className="rounded bg-white shadow" style={w ? { width: `${w}px` } : undefined}>
                          <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderTextLayer={false}
                            renderAnnotationLayer={true}   // keep images reliable
                            className="bg-white block"
                            onLoadSuccess={(page) => {
                              const wPx = Math.round(page.width * scale);
                              const hPx = Math.round(page.height * scale);
                              setPageDims((prev) =>
                                prev[pageNumber]?.w === wPx && prev[pageNumber]?.h === hPx
                                  ? prev
                                  : { ...prev, [pageNumber]: { w: wPx, h: hPx } }
                              );
                            }}
                            onRenderSuccess={() => {
                              requestAnimationFrame(() => rowVirtualizer.measure());
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Document>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};