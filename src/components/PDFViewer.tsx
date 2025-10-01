import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfUrl: string;
  onPageChange?: (pageNumber: number) => void;
  targetPage?: number;
  targetParagraph?: string;
}

export const PDFViewer = ({ pdfUrl, onPageChange, targetPage, targetParagraph }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [searchText, setSearchText] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (targetPage && targetPage > 0 && targetPage <= numPages) {
      scrollToPage(targetPage);
    }
  }, [targetPage, numPages]);

  useEffect(() => {
    if (targetParagraph && targetPage) {
      // Wait for page to render, then search for paragraph
      setTimeout(() => searchForParagraph(targetParagraph, targetPage), 500);
    }
  }, [targetParagraph, targetPage]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const scrollToPage = (pageNum: number) => {
    const pageElement = pageRefs.current[pageNum];
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
      onPageChange?.(pageNum);
    }
  };

  const searchForParagraph = async (paraLabel: string, startPage: number) => {
    // This is a simplified implementation
    // In production, you'd use PDF.js text layer API to find exact matches
    const searchTerms = paraLabel.replace(/[-.]/g, ' ');
    
    // Trigger browser's native find (if available)
    const win = window as any;
    if (win.find) {
      win.find(searchTerms, false, false, true, false, true, false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    
    // Determine which page is currently visible
    let visiblePage = 1;
    Object.keys(pageRefs.current).forEach((pageNum) => {
      const pageElement = pageRefs.current[parseInt(pageNum)];
      if (pageElement) {
        const rect = pageElement.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          visiblePage = parseInt(pageNum);
        }
      }
    });
    
    if (visiblePage !== currentPage) {
      setCurrentPage(visiblePage);
      onPageChange?.(visiblePage);
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

  return (
    <div className="flex flex-col h-full">
      {/* PDF Toolbar */}
      <div className="flex items-center justify-between gap-4 p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm whitespace-nowrap">
            Page {currentPage} of {numPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm whitespace-nowrap">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Find in document..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchText) {
                const win = window as any;
                if (win.find) {
                  win.find(searchText, false, false, true, false, true, false);
                }
              }
            }}
            className="w-64"
          />
        </div>
      </div>

      {/* PDF Content - Continuous Scroll */}
      <ScrollArea className="flex-1" onScrollCapture={handleScroll}>
        <div 
          ref={containerRef}
          className="flex flex-col items-center py-4 px-4 lg:px-8 bg-muted/30 w-full"
        >
          <div className="w-full max-w-5xl mx-auto">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-96">
                <div className="text-muted-foreground">Loading PDF...</div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-96">
                <div className="text-destructive">Failed to load PDF</div>
              </div>
            }
          >
            {Array.from(new Array(numPages), (_, index) => (
              <div
                key={`page_${index + 1}`}
                ref={(el) => (pageRefs.current[index + 1] = el)}
                className="mb-4 shadow-lg"
              >
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="bg-white"
                />
              </div>
            ))}
          </Document>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
