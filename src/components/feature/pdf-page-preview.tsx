
"use client";

// Polyfill for Promise.withResolvers
// Required by pdfjs-dist v4.0.379+ if the environment doesn't support it.
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

// Set workerSrc once when the module loads client-side
if (typeof window !== 'undefined') {
  const version = pdfjsLib.version;
  if (version) {
    const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    }
  } else {
    // Fallback if version is somehow not available, though unlikely
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
  const [actualRenderedDimensions, setActualRenderedDimensions] = useState<{width: number, height: number} | null>(null);
  
  // For debugging, helps identify logs from different instances
  const instanceId = useRef(`pdfpv-${pageIndex}-${(Math.random() * 1e6).toFixed(0)}`).current;


  useEffect(() => {
    let isActive = true;
    const currentCanvas = canvasRef.current;
    
    // Initial state reset for each effect run based on dependencies
    setIsLoading(true);
    setRenderError(null);
    setActualRenderedDimensions(null);

    if (!pdfDataUri) {
      if (isActive) setIsLoading(false);
      return;
    }

    if (!currentCanvas) {
      // This case should ideally not happen if canvas is part of the initial render with a key.
      // If it does, we can't render.
      if (isActive) {
         console.warn(`${instanceId}: Canvas element not available for rendering.`);
         setIsLoading(false);
         setRenderError("Canvas element not ready.");
      }
      return;
    }

    let pdfDoc: PDFDocumentProxy | null = null;
    let page: PDFPageProxy | null = null;

    const renderPdfPage = async () => {
      try {
        const base64Marker = ';base64,';
        const base64Index = pdfDataUri.indexOf(base64Marker);
        if (base64Index === -1) {
          throw new Error(`${instanceId}: Invalid PDF data URI format (missing base64 marker).`);
        }
        const pdfBase64Data = pdfDataUri.substring(base64Index + base64Marker.length);
        const pdfBinaryData = atob(pdfBase64Data);
        const pdfDataArray = new Uint8Array(pdfBinaryData.length);
        for (let i = 0; i < pdfBinaryData.length; i++) {
          pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
        }
        
        const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
        pdfDoc = await loadingTask.promise;

        if (!isActive || !pdfDoc) return;

        if (pdfDoc.numPages === 0) {
          throw new Error(`${instanceId}: PDF has no pages.`);
        }
        if (pageIndex < 0 || pageIndex >= pdfDoc.numPages) {
          throw new Error(`${instanceId}: Page index ${pageIndex + 1} is out of bounds (Total: ${pdfDoc.numPages}).`);
        }

        page = await pdfDoc.getPage(pageIndex + 1);
        if (!isActive || !page) return;

        const dynamicRotation = rotation || 0;
        const totalRotationForViewport = (page.rotate + dynamicRotation + 360) % 360;
        
        const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotationForViewport });
        if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
          throw new Error(`${instanceId}: Page viewport at scale 1 has invalid dimensions (H:${viewportAtScale1.height} W:${viewportAtScale1.width}).`);
        }

        const scale = targetHeight / viewportAtScale1.height;
        if (!Number.isFinite(scale) || scale <= 0) {
          throw new Error(`${instanceId}: Invalid scale calculated: ${scale.toFixed(4)} (targetHeight: ${targetHeight}, viewportH@1: ${viewportAtScale1.height}).`);
        }
        
        const viewport = page.getViewport({ scale, rotation: totalRotationForViewport });
        const canvasWidth = Math.max(1, Math.round(viewport.width));
        const canvasHeight = Math.max(1, Math.round(viewport.height)); // Should be very close to targetHeight

        // console.log(`${instanceId}: Rendering page ${pageIndex+1}. Scale: ${scale.toFixed(2)}. Viewport: ${canvasWidth}x${canvasHeight}. TargetH: ${targetHeight}`);

        if (canvasWidth <= 0 || canvasHeight <= 0) {
          throw new Error(`${instanceId}: Final canvas dimensions are invalid (W:${canvasWidth}, H:${canvasHeight}).`);
        }
        
        const context = currentCanvas.getContext('2d');
        if (!context) {
          throw new Error(`${instanceId}: Could not get canvas 2D context.`);
        }
        
        currentCanvas.width = canvasWidth;
        currentCanvas.height = canvasHeight;
        context.clearRect(0, 0, canvasWidth, canvasHeight); // Explicitly clear before drawing

        const RENDER_TIMEOUT = 15000; // 15 seconds
        const renderContextParams: RenderParameters = { canvasContext: context, viewport: viewport };
        
        const renderTask = page.render(renderContextParams);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${instanceId}: Render timed out for page ${pageIndex + 1} after ${RENDER_TIMEOUT/1000}s`)), RENDER_TIMEOUT)
        );

        await Promise.race([renderTask.promise, timeoutPromise]);

        if (isActive) {
          setActualRenderedDimensions({ width: canvasWidth, height: canvasHeight });
          setIsLoading(false);
        }

      } catch (err: any) {
        console.error(`${instanceId}: Error rendering PDF page ${pageIndex + 1}:`, err);
        if (isActive) {
          setRenderError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
          setIsLoading(false);
        }
      } finally {
        if (page && typeof page.cleanup === 'function') {
          try { page.cleanup(); } catch (cleanupError) { console.warn(`${instanceId}: Error during page.cleanup():`, cleanupError); }
        }
        if (pdfDoc && typeof (pdfDoc as any).destroy === 'function') {
          try { await (pdfDoc as any).destroy(); } catch (destroyError) { console.warn(`${instanceId}: Error during pdfDoc.destroy():`, destroyError); }
        }
      }
    };

    renderPdfPage();

    return () => {
      isActive = false;
      // Note: pdfDoc and page might be null if an error occurred early in `renderPdfPage`
      // The finally block in renderPdfPage should handle their cleanup if they were assigned.
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, instanceId]);


  const wrapperStyle: React.CSSProperties = {
    height: `${targetHeight}px`,
    width: 'auto', // Allow width to be determined by parent or content aspect ratio
  };
  
  if (actualRenderedDimensions) {
    // If we have rendered dimensions, we can set a more precise width for the wrapper
    // to match the canvas aspect ratio, helping with layout stability.
    // However, the parent containers (e.g. w-44) usually define the width.
    // For now, keeping width: 'auto' is simpler.
  }


  let content;
  if (renderError) {
    const apiV = pdfjsLib.version || 'N/A';
    const workerSrc = (typeof pdfjsLib.GlobalWorkerOptions.workerSrc === 'string' ? pdfjsLib.GlobalWorkerOptions.workerSrc : 'N/A');
    let shortError = "Render Error";
    if (renderError.includes("The API version") && renderError.includes("does not match the Worker version")) {
        shortError = `Lib Mismatch (API: ${apiV})`;
    } else if ((renderError.includes("Failed to fetch") || renderError.includes("NetworkError")) && (workerSrc.includes(".worker.min.mjs"))) {
        shortError = `Worker Load Fail (API: ${apiV})`;
    } else if (renderError.includes("Page index") && renderError.includes("out of bounds")) {
        shortError = "Invalid Page Index";
    }

    content = (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 border border-destructive/50 text-destructive-foreground rounded-md p-1 text-xs text-center"
        title={renderError} // Full error on hover
      >
        <FileWarning className="h-4 w-4 mb-0.5 flex-shrink-0" />
        <p className="leading-tight text-[10px] px-1">{shortError}</p>
      </div>
    );
  } else if (isLoading || !pdfDataUri) {
    // Show skeleton if loading or if no pdfDataUri is provided (initial state before upload)
    content = (
      <div className="absolute inset-0 flex items-center justify-center bg-background/30">
        <Skeleton
            className="rounded-md bg-muted/50"
            style={{
              height: `calc(100% - 4px)`, // respect padding/border
              width: `calc(100% - 4px)`
            }}
            aria-label={`Loading preview for page ${pageIndex + 1}`}
        />
      </div>
    );
  } else {
    // Render canvas only when not loading, no error, and pdfDataUri is present
    content = (
      <canvas
        key={`${pdfDataUri}-${pageIndex}-${rotation}-${targetHeight}`} // Re-key on targetHeight too
        ref={canvasRef}
        className={cn("border border-muted shadow-sm rounded-md bg-white", 
                      actualRenderedDimensions ? '' : 'opacity-0' // Hide until dimensions are set to prevent flicker
        )}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain', 
          display: isLoading || renderError ? 'none' : 'block', // Hide canvas if loading or error
        }}
        role="img"
        aria-label={`Preview of PDF page ${pageIndex + 1}`}
      />
    );
  }
  
  return (
    <div
      className={cn(
        "relative bg-transparent overflow-hidden flex items-center justify-center rounded-md",
        "border border-dashed border-muted-foreground/30", // Fallback border if content doesn't fill
        className
      )}
      style={wrapperStyle}
    >
      {content}
    </div>
  );
};

export default PdfPagePreview;

    