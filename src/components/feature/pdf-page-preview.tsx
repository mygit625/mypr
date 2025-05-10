'use client';

import type { VersionResponses } from 'pdfjs-dist';
import React, { useRef, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure pdf.js worker
if (typeof window !== 'undefined') {
  // Consistently use CDN for pdf.js worker to avoid path resolution issues.
  // The previous new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url) approach
  // could lead to incorrect file:/// paths for assets within node_modules.
  const pdfjsVersion = (pdfjsLib as any).version || '4.4.168'; // Use installed or a recent fallback
  const cdnWorkerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
  pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerSrc;
  console.log('Using CDN for pdf.js workerSrc:', cdnWorkerSrc);
}


interface PdfPagePreviewProps {
  pdfDataUri: string;
  pageIndex: number; // 0-based
  rotation: number; // 0, 90, 180, 270
  targetHeight: number;
  className?: string;
}

const PdfPagePreview: React.FC<PdfPagePreviewProps> = ({
  pdfDataUri,
  pageIndex,
  rotation,
  targetHeight,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setPageDimensions(null);

    if (!pdfDataUri || !canvasRef.current) {
      setIsLoading(false);
      if (!pdfDataUri) setError("No PDF data provided.");
      return;
    }

    let isMounted = true; // Flag to prevent state updates on unmounted component

    const renderPage = async () => {
      if (!isMounted) return;

      try {
        const canvas = canvasRef.current;
        if (!canvas) {
            if (isMounted) setError("Canvas element not found.");
            if (isMounted) setIsLoading(false);
            return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
          if (isMounted) setError("Could not get canvas context.");
          if (isMounted) setIsLoading(false);
          return;
        }

        const base64String = pdfDataUri.substring(pdfDataUri.indexOf(',') + 1);
        const binaryString = window.atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
        const pdf: PDFDocumentProxy = await loadingTask.promise;
        
        if (!isMounted) return;

        if (pageIndex >= pdf.numPages) {
          if (isMounted) setError(`Page index ${pageIndex} is out of bounds for PDF with ${pdf.numPages} pages.`);
          if (isMounted) setIsLoading(false);
          return;
        }

        const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); 
        if (!isMounted) return;

        const viewport = page.getViewport({ scale: 1, rotation: rotation });
        
        const scale = targetHeight / viewport.height;
        const scaledViewport = page.getViewport({ scale: scale, rotation: rotation });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        if (isMounted) setPageDimensions({ width: scaledViewport.width, height: scaledViewport.height});

        const renderContext: RenderParameters = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        await page.render(renderContext).promise;
        
      } catch (e: any) {
        console.error(`Error rendering PDF page ${pageIndex}:`, e);
        if (isMounted) setError(e.message || `Failed to render page ${pageIndex + 1}.`);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    // Ensure worker is configured before attempting to render.
    // The global workerSrc setup should ideally complete before this component mounts,
    // or pdfjsLib should handle waiting if workerSrc is a promise/future.
    // Adding a small delay or check if workerSrc is ready can be a robust measure.
    if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
        renderPage();
    } else {
        // If workerSrc is not set, it might be due to async setup.
        // We can wait a bit or rely on the CDN fallback to have been set.
        console.warn("pdf.js workerSrc not immediately available. Retrying render in a moment or relying on CDN.");
        const timeoutId = setTimeout(() => {
            if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
                renderPage();
            } else if (isMounted) {
                 setError("PDF.js worker could not be initialized. Cannot render preview.");
                 setIsLoading(false);
            }
        }, 500); // Wait 500ms for workerSrc to potentially be set
        return () => {
          clearTimeout(timeoutId);
          isMounted = false;
        }
    }
    
    return () => {
      isMounted = false; // Cleanup function to set isMounted to false when component unmounts
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight]);

  const containerStyle: React.CSSProperties = {
    height: `${targetHeight}px`,
    width: pageDimensions ? `${pageDimensions.width}px` : 'auto',
    maxWidth: '100%',
    margin: '0 auto', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  
  return (
    <div 
        className={cn(
            "bg-background rounded border-2 border-dashed border-border text-muted-foreground overflow-hidden relative",
            "flex items-center justify-center", 
            className
        )}
        style={containerStyle}
        data-ai-hint="page preview"
    >
      {isLoading && (
        <Skeleton className="w-full h-full" />
      )}
      {!isLoading && error && (
        <div className="p-2 text-center text-xs text-destructive flex flex-col items-center justify-center">
          <FileWarning className="h-6 w-6 mb-1" />
          <span>Error rendering preview.</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={cn(isLoading || error ? 'hidden' : 'block', 'max-w-full max-h-full object-contain')}
      />
    </div>
  );
};

export default PdfPagePreview;