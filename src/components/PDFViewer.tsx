import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, AlertCircle } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBoundary } from "./ErrorBoundary";

// Set worker source to match the version used by react-pdf
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

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
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Virtual scrolling - only render visible pages
  const rowVirtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => pageHeights[index + 1] || 1100,
    overscan: 3, // Render 3 extra pages above/below viewport for smooth scrolling
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  // Track current page based on visible items
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length > 0) {
      // Get the middle visible item
      const middleIndex = Math.floor(virtualItems.length / 2);
      const middleItem = virtualItems[middleIndex];
      const pageNumber = middleItem.index + 1;
      
      if (pageNumber !== currentPage) {
        setCurrentPage(pageNumber);
        onPageChange?.(pageNumber);
      }
    }
  }, [rowVirtualizer.getVirtualItems(), onPageChange]);

  // Scroll to target page when available
  useEffect(() => {
    if (!targetPage || targetPage < 1 || targetPage > numPages) return;
    rowVirtualizer.scrollToIndex(targetPage - 1, {
      align: "start",
      behavior: "smooth",
    });
  }, [targetPage, numPages, rowVirtualizer]);

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

  // Remeasure when scale changes
  useEffect(() => {
    if (numPages > 0) {
      rowVirtualizer.measure();
      // Clear cached heights to force remeasurement
      setPageHeights({});
    }
  }, [scale, numPages]);

  const onLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const scrollToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= numPages) {
      rowVirtualizer.scrollToIndex(pageNum - 1, {
        align: "start",
        behavior: "smooth",
      });
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

      {/* Virtualized scroll container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-muted/30 py-6"
        role="region"
        aria-label="PDF document viewer"
      >
        <div className="mx-auto w-full px-4 lg:px-8">
          <div className="mx-auto" style={{ maxWidth: '210mm' }}>
          <ErrorBoundary
            resetKeys={[pdfUrl]}
            fallback={
              <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">PDF Viewer Error</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      The PDF viewer encountered an error. Please refresh the page or try again later.
                    </p>
                  </div>
                </div>
              </div>
            }
            onError={(error) => console.error('PDF Viewer Error:', error)}
          >
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
              {/* Virtual container with total height */}
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {/* Only render visible pages */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const pageNumber = virtualRow.index + 1;
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="mb-6"
                    >
                      <div className="rounded bg-white shadow mx-auto">
                        <Page
                          pageNumber={pageNumber}
                          width={794} // A4 width in pixels at 96 DPI (210mm)
                          scale={scale}
                          renderTextLayer
                          renderAnnotationLayer
                          className="bg-white mx-auto"
                          onLoadSuccess={(page) => {
                            // Cache the actual page height for better estimates
                            const height = page.height * scale;
                            setPageHeights((prev) => ({
                              ...prev,
                              [pageNumber]: height,
                            }));
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