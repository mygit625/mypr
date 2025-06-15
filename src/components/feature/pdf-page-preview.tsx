
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

const importedApiVersion = pdfjsLib.version;

if (typeof window !== 'undefined' && importedApiVersion) {
    const dynamicWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${importedApiVersion}/pdf.worker.min.mjs`;
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== dynamicWorkerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = dynamicWorkerSrc;
    }
} else if (typeof window !== 'undefined') {
    const fallbackVersion = "4.4.168"; // Fallback if importedApiVersion is somehow undefined client-side
    const fallbackWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${fallbackVersion}/pdf.worker.min.mjs`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = fallbackWorkerSrc;
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
  const [isLoading, setIsLoading] = useState(true); // Default to true if pdfDataUri might be present
  const [renderError, setRenderError] = useState<string | null>(null);
  // stableInstanceLogPrefix is primarily for debugging and should not affect rendering logic.
  const stableInstanceLogPrefix = useRef(`pdf-pv-${pageIndex}-${Math.random().toString(36).substring(2, 7)}`).current;
  const [currentWorkerSrc, setCurrentWorkerSrc] = useState<string | null>(null);
  const [actualUsedApiVersion, setActualUsedApiVersion] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const currentCanvas = canvasRef.current;
    const logPrefix = `${stableInstanceLogPrefix}-eff`;

    // Initialize states based on current props
    if (!pdfDataUri) {
      if (isActive) {
        setIsLoading(false);
        setRenderError(null); // No data is not an error for the preview itself
      }
      return;
    }

    if (!currentCanvas) {
      // Canvas not ready, ensure loading state is true if we expect to render
      if (isActive) {
        setIsLoading(true); // Keep loading if canvas is not yet available but PDF data is
        setRenderError(null);
      }
      return;
    }

    // If we have PDF data and a canvas, proceed with rendering logic
    if (isActive) {
      setIsLoading(true);
      setRenderError(null);
    }
    
    setActualUsedApiVersion(pdfjsLib.version);
    setCurrentWorkerSrc(pdfjsLib.GlobalWorkerOptions.workerSrc as string);

    let pdfDoc: PDFDocumentProxy | null = null;
    let page: PDFPageProxy | null = null;

    const renderPdfPage = async () => {
      try {
        const base64Marker = ';base64,';
        const base64Index = pdfDataUri!.indexOf(base64Marker); // pdfDataUri is checked above
        if (base64Index === -1) throw new Error(`${logPrefix}-render Invalid PDF data URI format.`);
        const pdfBase64Data = pdfDataUri!.substring(base64Index + base64Marker.length);
        const pdfBinaryData = atob(pdfBase64Data);
        const pdfDataArray = new Uint8Array(pdfBinaryData.length);
        for (let i = 0; i < pdfBinaryData.length; i++) {
          pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
        pdfDoc = await loadingTask.promise;

        if (!isActive || !pdfDoc) {
          // If component became inactive or pdfDoc is null, exit early.
          // Resource cleanup will be handled in finally or effect cleanup.
          return;
        }

        if (pageIndex < 0 || pageIndex >= pdfDoc.numPages) {
          throw new Error(`${logPrefix}-render Page index ${pageIndex + 1} out of bounds (Total: ${pdfDoc.numPages}).`);
        }

        page = await pdfDoc.getPage(pageIndex + 1);
        if (!isActive || !page) return;

        const dynamicRotation = rotation || 0;
        const totalRotationForViewport = (page.rotate + dynamicRotation + 360) % 360;
        const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotationForViewport });

        if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
          throw new Error(`${logPrefix}-render Page viewport@1 has invalid dimensions (H:${viewportAtScale1.height} W:${viewportAtScale1.width}).`);
        }
        const scale = targetHeight / viewportAtScale1.height;
        if (!Number.isFinite(scale) || scale <= 0) {
          throw new Error(`${logPrefix}-render Invalid scale: ${scale.toFixed(4)}.`);
        }
        const viewport = page.getViewport({ scale, rotation: totalRotationForViewport });
        if (viewport.width <= 0 || viewport.height <= 0) {
          throw new Error(`${logPrefix}-render Final viewport has invalid dimensions (W:${viewport.width.toFixed(2)} H:${viewport.height.toFixed(2)}).`);
        }

        const context = currentCanvas!.getContext('2d'); // currentCanvas is checked above
        if (!context) throw new Error(`${logPrefix}-render Could not get canvas 2D context.`);
        
        const newCanvasWidth = Math.max(1, Math.round(viewport.width));
        const newCanvasHeight = Math.max(1, Math.round(viewport.height));

        currentCanvas!.width = newCanvasWidth;
        currentCanvas!.height = newCanvasHeight;
        context.clearRect(0, 0, newCanvasWidth, newCanvasHeight);

        const RENDER_TIMEOUT = 15000;
        const renderContextParams: RenderParameters = { canvasContext: context, viewport: viewport };
        const renderTask = page.render(renderContextParams);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${logPrefix}-render Render timed out for page ${pageIndex + 1} after ${RENDER_TIMEOUT/1000}s`)), RENDER_TIMEOUT)
        );

        await Promise.race([renderTask.promise, timeoutPromise]);

        if (isActive) setIsLoading(false);

      } catch (err: any) {
        if (isActive) {
          setRenderError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
          setIsLoading(false);
        }
      } finally {
        // Cleanup resources
        if (page && typeof page.cleanup === 'function') {
          try { page.cleanup(); } catch (cleanupError) { console.warn(`${logPrefix}-warn Error during page.cleanup():`, cleanupError); }
        }
        if (pdfDoc && typeof (pdfDoc as any).destroy === 'function') {
          try { await (pdfDoc as any).destroy(); } catch (destroyError) { console.warn(`${logPrefix}-warn Error during pdfDoc.destroy():`, destroyError); }
        }
      }
    };

    renderPdfPage();

    return () => {
      isActive = false;
      // Additional cleanup if an operation was ongoing when component unmounts
      // This is harder to manage for promises already in flight without cancellation tokens
      // The `isActive` flag helps prevent state updates on unmounted component
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight]); // Removed stableInstanceLogPrefix

  const estimatedWidth = targetHeight * (210 / 297); // Approximate A4 aspect ratio

  let errorDisplay = null;
  if (renderError) {
      let detailedErrorMessage = renderError;
      const apiV = actualUsedApiVersion || importedApiVersion || 'N/A';
      const workerSrcPath = currentWorkerSrc || 'N/A';

      if (renderError.includes("The API version") && renderError.includes("does not match the Worker version")) {
          detailedErrorMessage = `PDF Library Mismatch! Imported API: ${apiV}, Worker expected to match. Worker Path: ${workerSrcPath}. This is an environment setup issue.`;
      } else if ((renderError.includes("Failed to fetch") || renderError.includes("NetworkError")) && (workerSrcPath.includes(".worker.min.mjs") || workerSrcPath.includes(".worker.js"))) {
          detailedErrorMessage = `Worker Load Fail! API: ${apiV}. Worker Path: ${workerSrcPath}. Check CDN or network. Version '${apiV}' may not exist on CDN.`;
      } else if (renderError.includes("Cannot use the same canvas during multiple render() operations")) {
          detailedErrorMessage = `Canvas render conflict for page ${pageIndex + 1}. This suggests overlapping render calls.`;
      } else if (renderError.includes("Promise.withResolvers")) {
          detailedErrorMessage = `JS Feature Missing: Promise.withResolvers is not defined. Polyfill might be needed or browser is too old.`;
      }

      errorDisplay = (
         <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 border border-destructive/50 text-destructive-foreground rounded-md p-1 text-xs text-center pointer-events-none"
            title={detailedErrorMessage}
          >
            <FileWarning className="h-4 w-4 mb-0.5 flex-shrink-0" />
            <p className="leading-tight text-[10px] px-1">
                { (renderError.includes("The API version") && renderError.includes("does not match"))
                    ? `Lib Mismatch (API: ${apiV})`
                    : (renderError.includes("Failed to fetch") || renderError.includes("NetworkError")) && (workerSrcPath.includes(".worker.min.mjs") || workerSrcPath.includes(".worker.js"))
                        ? `Worker Fail (API: ${apiV})`
                        : renderError.includes("Cannot use the same canvas")
                            ? `Canvas Conflict`
                            : renderError.includes("Promise.withResolvers")
                                ? `JS Feature Missing`
                                : 'PDF Render Error'
                }
            </p>
             {(renderError.includes("The API version") && renderError.includes("does not match")) &&
             <p className="leading-tight text-[9px] opacity-80 mt-0.5 px-1">Expected worker to match API.</p>
            }
            {((renderError.includes("Failed to fetch") || renderError.includes("NetworkError")) && (workerSrcPath.includes(".worker.min.mjs") || workerSrcPath.includes(".worker.js"))) &&
             <p className="leading-tight text-[9px] opacity-80 mt-0.5 px-1">Worker for API '{apiV}' might be missing on CDN.</p>
            }
            {(renderError.includes("Promise.withResolvers")) &&
             <p className="leading-tight text-[9px] opacity-80 mt-0.5 px-1">Modern JS feature needed by PDF library.</p>
            }
          </div>
      );
  }
  
  return (
    <div
      className={cn("relative bg-transparent overflow-hidden flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-md", className)}
      style={{
        height: `${targetHeight}px`,
        width: `auto`, // Let content determine width up to max
        minWidth: `${Math.max(50, Math.round(estimatedWidth * 0.5))}px`, // Ensure some min width
        maxWidth: `${Math.max(100, Math.round(estimatedWidth * 2))}px`, // Prevent excessive width
      }}
    >
      {!pdfDataUri && !isLoading && (
         <Skeleton
            className={cn("rounded-md bg-muted/30 w-full h-full")}
            aria-label={`No PDF loaded for page ${pageIndex + 1} preview`}
        />
      )}

      {pdfDataUri && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-background/30 backdrop-blur-sm">
            <Skeleton
                className="rounded-md bg-muted/50"
                style={{
                  height: `calc(100% - 4px)`,
                  width: `calc(100% - 4px)`
                }}
                aria-label={`Loading preview for page ${pageIndex + 1}`}
            />
        </div>
      )}
      
      {pdfDataUri && renderError && errorDisplay}

      {pdfDataUri && !isLoading && !renderError && (
        <canvas
            key={`${pdfDataUri}-${pageIndex}-${rotation}`} // Crucial for re-mounting canvas on prop change
            ref={canvasRef}
            className={cn("border border-muted shadow-sm rounded-md bg-white")}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain', // Ensure canvas scales down if necessary
            }}
            role="img"
            aria-label={`Preview of PDF page ${pageIndex + 1}`}
        />
      )}
    </div>
  );
};

export default PdfPagePreview;

    