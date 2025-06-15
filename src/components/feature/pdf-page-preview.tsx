
"use client";

// Polyfill for Promise.withResolvers
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import React, { useRef, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

if (typeof window !== 'undefined') {
  const version = pdfjsLib.version;
  if (version) {
    const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    }
  } else {
    const fallbackVersion = "4.4.168"; 
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${fallbackVersion}/pdf.worker.min.mjs`;
    console.warn("PdfPagePreview: pdfjsLib.version was undefined, using fallback worker version:", fallbackVersion);
  }
}

interface PdfPagePreviewProps {
  pdfDataUri: string | null;
  pageIndex: number; // 0-indexed
  rotation?: number;
  targetHeight: number;
  className?: string;
}

const PdfPagePreview: React.FC<PdfPagePreviewProps> = ({
  pdfDataUri,
  pageIndex,
  rotation = 0,
  targetHeight,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  const uniqueCanvasKey = `${pdfDataUri}-${pageIndex}-${rotation}-${targetHeight}`;

  useEffect(() => {
    let isActive = true;
    const currentCanvas = canvasRef.current;

    setIsLoading(true);
    setRenderError(null);

    if (!pdfDataUri || !currentCanvas) {
      if (isActive) setIsLoading(false);
      if (!pdfDataUri && isActive) setRenderError("No PDF data.");
      if (!currentCanvas && isActive) setRenderError("Canvas not ready.");
      return;
    }

    let pdfDoc: PDFDocumentProxy | null = null;
    let page: PDFPageProxy | null = null;

    const renderPdfPage = async () => {
      try {
        const base64Marker = ';base64,';
        const base64Index = pdfDataUri.indexOf(base64Marker);
        if (base64Index === -1) throw new Error("Invalid PDF data URI format.");
        
        const pdfBase64Data = pdfDataUri.substring(base64Index + base64Marker.length);
        const pdfBinaryData = atob(pdfBase64Data);
        const pdfDataArray = new Uint8Array(pdfBinaryData.length);
        for (let i = 0; i < pdfBinaryData.length; i++) {
          pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
        }
        
        const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
        pdfDoc = await loadingTask.promise;

        if (!isActive || !pdfDoc) return;
        if (pdfDoc.numPages === 0) throw new Error("PDF has no pages.");
        if (pageIndex < 0 || pageIndex >= pdfDoc.numPages) {
          throw new Error(`Page index ${pageIndex + 1} out of bounds (Total: ${pdfDoc.numPages}).`);
        }

        page = await pdfDoc.getPage(pageIndex + 1);
        if (!isActive || !page) return;

        const totalRotationForViewport = (page.rotate + rotation + 360) % 360;
        const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotationForViewport });

        if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
          throw new Error(`Page viewport (scale 1) has invalid dimensions W:${viewportAtScale1.width} H:${viewportAtScale1.height}.`);
        }

        const scale = targetHeight / viewportAtScale1.height;
        if (!Number.isFinite(scale) || scale <= 0) {
          throw new Error(`Invalid scale: ${scale.toFixed(4)} (targetH: ${targetHeight}, vp H@1: ${viewportAtScale1.height}).`);
        }
        
        const viewport = page.getViewport({ scale, rotation: totalRotationForViewport });
        const canvasWidth = Math.max(1, Math.round(viewport.width));
        const canvasHeight = Math.max(1, Math.round(viewport.height));
        
        const context = currentCanvas.getContext('2d');
        if (!context) throw new Error("Could not get canvas 2D context.");
        
        currentCanvas.width = canvasWidth;
        currentCanvas.height = canvasHeight;
        context.clearRect(0, 0, canvasWidth, canvasHeight);

        const RENDER_TIMEOUT = 15000;
        const renderContextParams: RenderParameters = { canvasContext: context, viewport: viewport };
        const renderTask = page.render(renderContextParams);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Render timed out for page ${pageIndex + 1}`)), RENDER_TIMEOUT)
        );

        await Promise.race([renderTask.promise, timeoutPromise]);

        if (isActive) setIsLoading(false);

      } catch (err: any) {
        console.error(`PdfPagePreview Error (page ${pageIndex + 1}):`, err);
        if (isActive) {
          setRenderError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
          setIsLoading(false);
        }
      } finally {
        if (isActive) { // Ensure cleanup only happens if component is still active
            if (page && typeof page.cleanup === 'function') {
              try { page.cleanup(); } catch (cleanupError) { console.warn("Error during page.cleanup():", cleanupError); }
            }
            if (pdfDoc && typeof (pdfDoc as any).destroy === 'function') {
              try { await (pdfDoc as any).destroy(); } catch (destroyError) { console.warn("Error during pdfDoc.destroy():", destroyError); }
            }
        }
      }
    };

    renderPdfPage();

    return () => {
      isActive = false;
      // Cleanup attempt for pdfDoc and page if renderPdfPage didn't reach its finally block
      // This is more of a safety net. The primary cleanup should be in renderPdfPage's finally.
        if (page && typeof page.cleanup === 'function') {
            try { page.cleanup(); } catch (e) { /* silent */ }
        }
        if (pdfDoc && typeof (pdfDoc as any).destroy === 'function') {
            (pdfDoc as any).destroy().catch(() => {/* silent */});
        }
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight]); // Effect dependencies

  const wrapperStyle: React.CSSProperties = {
    height: `${targetHeight}px`, 
    // width is determined by parent or content aspect ratio
  };

  if (!pdfDataUri && !isLoading) { // If no PDF is provided at all
     return (
        <div 
            className={cn("relative flex items-center justify-center rounded-md border border-dashed border-muted-foreground/30", className)} 
            style={wrapperStyle}
        >
            <span className="text-xs text-muted-foreground p-2 text-center">No PDF loaded</span>
        </div>
    );
  }

  return (
    <div
      className={cn(
        "relative bg-transparent overflow-hidden flex items-center justify-center rounded-md",
        className // User-provided classes like border
      )}
      style={wrapperStyle}
    >
      {isLoading && (
         <div className="absolute inset-0 flex items-center justify-center bg-background/30">
            <Skeleton
                className="rounded-md bg-muted/50"
                style={{ height: `calc(100% - 4px)`, width: `calc(100% - 4px)` }}
                aria-label={`Loading preview for page ${pageIndex + 1}`}
            />
        </div>
      )}
      {renderError && !isLoading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 border border-destructive/50 text-destructive-foreground rounded-md p-1 text-xs text-center"
          title={renderError}
        >
          <FileWarning className="h-4 w-4 mb-0.5 flex-shrink-0" />
          <p className="leading-tight text-[10px] px-1">Preview Error</p>
        </div>
      )}
      <canvas
        key={uniqueCanvasKey} // Re-keying the canvas forces a re-mount
        ref={canvasRef}
        className={cn(
            "border border-muted shadow-sm rounded-md bg-white",
            (isLoading || renderError) && "opacity-0" // Hide if loading or error
        )}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          display: (isLoading || renderError) ? 'none' : 'block',
        }}
        role="img"
        aria-label={`Preview of PDF page ${pageIndex + 1}`}
      />
    </div>
  );
};

export default PdfPagePreview;
