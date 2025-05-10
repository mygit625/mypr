
'use client';

import type { VersionResponses } from 'pdfjs-dist';
import React, { useRef, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure pdf.js worker
if (typeof window !== 'undefined') {
  // Dynamically import and set workerSrc only on the client side
  import('pdfjs-dist/build/pdf.worker.mjs').then(workerModule => {
     // Attempt to use the default export of the worker module.
     // This is a common pattern if the module's main export is the worker constructor or path.
     if (workerModule.default) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
     } else {
        // If default is not available, this will likely cause an error later or pdf.js won't find the worker.
        // The catch block below will then handle it by falling back to CDN.
        console.warn("pdf.worker.mjs module or its default export is not in the expected format. Falling back to CDN might occur if this path fails.");
        // As a last resort before CDN, if workerModule itself is the src (e.g. a string path from bundler)
        // This is less likely for an object module without a clear string path.
        // Forcing it to fallback to CDN if default is not what's expected might be safer.
        throw new Error("Worker module default export not found.");
     }
  }).catch(error => {
    console.error("Failed to load or set pdf.js worker dynamically, falling back to CDN:", error);
    // Fallback CDN path if dynamic import fails or if the module structure isn't as expected.
    // Ensure the version matches your installed pdfjs-dist version for compatibility.
     pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as any).version}/pdf.worker.min.js`;
  });
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

    const renderPage = async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) {
            setError("Canvas element not found.");
            setIsLoading(false);
            return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
          setError("Could not get canvas context.");
          setIsLoading(false);
          return;
        }

        // Convert data URI to ArrayBuffer
        const base64String = pdfDataUri.substring(pdfDataUri.indexOf(',') + 1);
        const binaryString = window.atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
        const pdf: PDFDocumentProxy = await loadingTask.promise;
        
        if (pageIndex >= pdf.numPages) {
          setError(`Page index ${pageIndex} is out of bounds for PDF with ${pdf.numPages} pages.`);
          setIsLoading(false);
          return;
        }

        const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); // pdf.js is 1-indexed

        // Get viewport with the specified rotation
        // The `rotation` prop is the final absolute rotation desired for the viewport.
        // `page.rotate` is the page's inherent rotation. pdf.js `getViewport` `rotation` arg ADDS to `page.rotate`.
        // So, if `props.rotation` is meant to be the page's final rotation, we might need to adjust.
        // However, `PageData.rotation` in `organize/actions` starts with `page.getRotation().angle` from pdf-lib
        // and is then modified. This implies `props.rotation` is the target absolute rotation.
        const viewport = page.getViewport({ scale: 1, rotation: rotation });
        
        const scale = targetHeight / viewport.height;
        const scaledViewport = page.getViewport({ scale: scale, rotation: rotation });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        setPageDimensions({ width: scaledViewport.width, height: scaledViewport.height});

        const renderContext: RenderParameters = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        await page.render(renderContext).promise;
        
      } catch (e: any) {
        console.error(`Error rendering PDF page ${pageIndex}:`, e);
        setError(e.message || `Failed to render page ${pageIndex + 1}.`);
      } finally {
        setIsLoading(false);
      }
    };

    // Ensure worker is configured before rendering.
    // If workerSrc is not set or is pending, pdfjsLib.getDocument might fail or hang.
    // A simple check like this doesn't guarantee worker is ready, but it's a start.
    if (pdfjsLib.GlobalWorkerOptions.workerSrc || typeof window === 'undefined') {
        renderPage();
    } else {
        // Wait a bit for workerSrc to be set by the dynamic import, then try rendering
        // This is a bit of a hack; a more robust solution would use a state/promise for worker readiness.
        const timer = setTimeout(() => {
            if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
                renderPage();
            } else {
                console.warn("PDF.js workerSrc still not set after delay. Rendering might fail or use fallback.");
                setError("PDF.js worker setup timed out. Try reloading.");
                setIsLoading(false);
            }
        }, 1000); // Wait 1 second for worker setup
        return () => clearTimeout(timer);
    }
    
    // Cleanup function to cancel rendering if component unmounts or dependencies change
    return () => {
        // pdf.js rendering task does not have a direct cancel method on the promise.
        // If loadingTask is still active, its promise can be destroyed if it supports it.
        // loadingTask.destroy(); // If available and needed for very large PDFs / quick navigation.
    };

  }, [pdfDataUri, pageIndex, rotation, targetHeight]);

  const containerStyle: React.CSSProperties = {
    height: `${targetHeight}px`,
    width: pageDimensions ? `${pageDimensions.width}px` : 'auto',
    maxWidth: '100%',
    margin: '0 auto', // Center the preview
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  
  return (
    <div 
        className={cn(
            "bg-background rounded border-2 border-dashed border-border text-muted-foreground overflow-hidden relative",
            "flex items-center justify-center", // Ensure content (canvas/skeleton/error) is centered
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

