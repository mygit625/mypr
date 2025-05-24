
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// Initialize workerSrc once on the client side when the module loads.
// Ensure this version matches the installed pdfjs-dist version in package.json
const PDF_JS_VERSION = "4.4.168";

if (typeof window !== 'undefined') {
  const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== cdnPath) {
    console.log(`PdfPagePreview: Setting pdfjsLib.GlobalWorkerOptions.workerSrc to ${cdnPath}`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
  }
}

interface PdfPagePreviewProps {
  pdfDataUri: string | null;
  pageIndex: number; // 0-indexed
  rotation?: number;
  targetHeight: number;
  className?: string;
}

interface RenderOutput {
  width: number;
  height: number;
}

async function renderPdfPageToCanvas(
  canvas: HTMLCanvasElement,
  pdfDataUri: string,
  pageIndex: number,
  rotation: number,
  targetHeight: number,
  logPrefix: string // Changed to currentLogPrefix in useEffect, ensuring it's passed here
): Promise<RenderOutput> {
  console.log(`${logPrefix} renderPdfPageToCanvas: Starting for page ${pageIndex + 1}, targetHeight: ${targetHeight}`);

  const base64Marker = ';base64,';
  const base64Index = pdfDataUri.indexOf(base64Marker);
  if (base64Index === -1) {
    throw new Error(`${logPrefix} Invalid PDF data URI format.`);
  }

  const pdfBase64Data = pdfDataUri.substring(base64Index + base64Marker.length);
  let pdfBinaryData;
  try {
    pdfBinaryData = atob(pdfBase64Data);
  } catch (e) {
    throw new Error(`${logPrefix} Failed to decode base64 PDF data: ${(e as Error).message}`);
  }

  const pdfDataArray = new Uint8Array(pdfBinaryData.length);
  for (let i = 0; i < pdfBinaryData.length; i++) {
    pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
  }

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      throw new Error(`${logPrefix} PDF.js workerSrc not configured. This should have been set at module load.`);
  }

  console.log(`${logPrefix} Calling pdfjsLib.getDocument() for page ${pageIndex + 1}`);
  const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });

  let pdf: PDFDocumentProxy | null = null;
  try {
    pdf = await loadingTask.promise;
    console.log(`${logPrefix} PDF loaded. Total pages: ${pdf.numPages}. Target page: ${pageIndex + 1}`);

    if (pageIndex < 0 || pageIndex >= pdf.numPages) {
      throw new Error(`${logPrefix} Page index ${pageIndex + 1} is out of bounds (Total: ${pdf.numPages}).`);
    }

    const page: PDFPageProxy = await pdf.getPage(pageIndex + 1);
    console.log(`${logPrefix} Page ${pageIndex + 1} obtained. Original rotation: ${page.rotate}`);

    const normalizedDynamicRotation = (rotation || 0) % 360;
    const totalRotation = (page.rotate + normalizedDynamicRotation + 360) % 360;
    console.log(`${logPrefix} Total rotation for viewport: ${totalRotation} (Page intrinsic: ${page.rotate}, Dynamic: ${normalizedDynamicRotation})`);

    const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotation });
    if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
      throw new Error(`${logPrefix} Page viewport at scale 1 has invalid dimensions (H:${viewportAtScale1.height} W:${viewportAtScale1.width}).`);
    }

    const scale = targetHeight / viewportAtScale1.height;
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error(`${logPrefix} Invalid scale: ${scale.toFixed(4)}. TargetH: ${targetHeight}, ViewportH: ${viewportAtScale1.height}`);
    }
    console.log(`${logPrefix} Calculated scale: ${scale} for page ${pageIndex + 1}`);

    const viewport = page.getViewport({ scale, rotation: totalRotation });
    if (viewport.width <= 0 || viewport.height <= 0) {
      throw new Error(`${logPrefix} Calculated viewport for rendering has invalid dimensions (W:${viewport.width} H:${viewport.height}).`);
    }
    console.log(`${logPrefix} Viewport calculated: W=${viewport.width.toFixed(2)}, H=${viewport.height.toFixed(2)} for page ${pageIndex + 1}`);

    const context = canvas.getContext('2d');
    if (!context) throw new Error(`${logPrefix} Could not get canvas 2D context for page ${pageIndex + 1}.`);

    const newCanvasWidth = Math.max(1, Math.round(viewport.width));
    const newCanvasHeight = Math.max(1, Math.round(viewport.height));

    canvas.height = newCanvasHeight;
    canvas.width = newCanvasWidth;

    console.log(`${logPrefix} Canvas attributes set: W=${canvas.width}, H=${canvas.height} for page ${pageIndex + 1}.`);

    const RENDER_TIMEOUT = 15000; // 15 seconds
    const renderContext: RenderParameters = { canvasContext: context, viewport: viewport };
    const renderTask = page.render(renderContext);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${logPrefix} Render timed out for page ${pageIndex + 1} after ${RENDER_TIMEOUT/1000}s`)), RENDER_TIMEOUT)
    );

    console.log(`${logPrefix} Starting page.render() for page ${pageIndex + 1}`);
    await Promise.race([renderTask.promise, timeoutPromise]);
    console.log(`${logPrefix} page.render() COMPLETED SUCCESSFULLY for page ${pageIndex + 1}.`);

    try {
      page.cleanup();
    } catch (cleanupError) {
      console.warn(`${logPrefix} Error during page cleanup for page ${pageIndex + 1}:`, cleanupError);
    }
    return { width: newCanvasWidth, height: newCanvasHeight };

  } finally {
    if (pdf && typeof (pdf as any).destroy === 'function') {
      console.log(`${logPrefix} Destroying PDF document object.`);
      try {
        await (pdf as any).destroy();
      } catch (destroyError) {
        console.warn(`${logPrefix} Error destroying PDF document:`, destroyError);
      }
    } else if (loadingTask && typeof (loadingTask as any).destroy === 'function') {
      console.log(`${logPrefix} Destroying loading task.`);
      (loadingTask as any).destroy();
    }
  }
}


const PdfPagePreview: React.FC<PdfPagePreviewProps> = ({
  pdfDataUri,
  pageIndex,
  rotation = 0,
  targetHeight,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // Instance-specific prefix for logs, helps differentiate between multiple previews
  const instanceLogPrefix = useRef(`pdf-pv-${pageIndex}-${Math.random().toString(36).substring(2, 5)}`).current;

  useEffect(() => {
    let isActive = true;
    const currentCanvas = canvasRef.current;
    // Render-attempt-specific prefix for more granular logging within a single preview instance's lifecycle
    const renderAttemptLogPrefix = `${instanceLogPrefix}-render-${Math.random().toString(36).substring(2, 7)}`;

    console.log(`${renderAttemptLogPrefix} useEffect triggered. pdfDataUri: ${pdfDataUri ? 'present' : 'null'}. Canvas available: ${!!currentCanvas}. Rotation: ${rotation}, TargetHeight: ${targetHeight}`);

    // Reset state for this render attempt
    setError(null);
    setDimensions(null);

    if (!pdfDataUri) {
      console.log(`${renderAttemptLogPrefix} No pdfDataUri provided.`);
      if (isActive) {
        setError("No PDF data provided.");
        setLoading(false); // Ensure loading is false if no data
      }
      if (currentCanvas) { // Clear canvas if it exists
        const context = currentCanvas.getContext('2d');
        if (context) context.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
      }
      return;
    }

    if (!currentCanvas) {
      console.log(`${renderAttemptLogPrefix} Canvas ref not current. Will show loading. Effect might re-run if canvas becomes available.`);
      if (isActive) {
        setLoading(true); // Show loading skeleton if canvas isn't ready
      }
      return;
    }

    // If we have URI and canvas, start the loading process for rendering.
    if (isActive) {
      setLoading(true);
    }
    console.log(`${renderAttemptLogPrefix} Conditions met (pdfDataUri, currentCanvas), calling initRender.`);

    const initRender = async () => {
      console.log(`${renderAttemptLogPrefix} initRender started.`);
      try {
        // Explicitly clear canvas before rendering to prevent old content flashing
        const context = currentCanvas.getContext('2d');
        if (context) {
            context.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
            console.log(`${renderAttemptLogPrefix} Canvas cleared before rendering.`);
        }

        const resultDimensions = await renderPdfPageToCanvas(
            currentCanvas,
            pdfDataUri!, // Known to be non-null here
            pageIndex,
            rotation,
            targetHeight,
            renderAttemptLogPrefix // Pass the render-attempt-specific log prefix
        );
        if (isActive) {
            console.log(`${renderAttemptLogPrefix} Render successful. Setting dimensions:`, resultDimensions);
            setDimensions(resultDimensions);
            setError(null); // Clear any previous error
        } else {
            console.log(`${renderAttemptLogPrefix} Render successful but component no longer active.`);
        }
      } catch (err: any) {
        console.error(`${renderAttemptLogPrefix} Error during renderPdfPageToCanvas:`, err.message, err.stack ? err.stack.substring(0,300) : '');
        if (isActive) {
            setError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
            setDimensions(null); // Clear dimensions on error
        } else {
            console.log(`${renderAttemptLogPrefix} Error occurred during render, but component no longer active.`);
        }
      } finally {
        if (isActive) {
            console.log(`${renderAttemptLogPrefix} initRender finished. Setting loading=false.`);
            setLoading(false);
        } else {
            console.log(`${renderAttemptLogPrefix} initRender finished, but component no longer active, loading state not changed.`);
        }
      }
    };

    initRender();

    return () => {
      console.log(`${renderAttemptLogPrefix} useEffect cleanup: setting isActive=false.`);
      isActive = false;
      // Consider cancelling any ongoing PDF.js render task if the library supports it
      // For now, the isActive flag prevents state updates on an unmounted component
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, instanceLogPrefix]); // instanceLogPrefix is stable for the component instance

  const currentDisplayHeight = targetHeight;
  // Estimate width for skeleton based on common A4 portrait aspect ratio if actual dimensions aren't available yet
  const estimatedWidth = dimensions ? dimensions.width : Math.max(50, targetHeight * (210 / 297));

  if (loading) {
    return (
      <Skeleton
        className={cn("rounded-md bg-muted/50 transition-all", className)}
        style={{ height: `${currentDisplayHeight}px`, width: `${estimatedWidth}px` }}
        aria-label={`Loading preview for page ${pageIndex + 1}`}
      />
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-destructive/10 border border-destructive text-destructive-foreground rounded-md p-2 text-xs text-center overflow-hidden transition-all",
          className
        )}
        style={{ height: `${currentDisplayHeight}px`, width: `${Math.max(80, estimatedWidth)}px` }} // Ensure a minimum width for error
        title={error}
      >
        <FileWarning className="h-5 w-5 mb-1 flex-shrink-0" />
        <p className="leading-tight">Page {pageIndex + 1}: Error</p>
        <p className="leading-tight opacity-80 truncate hover:whitespace-normal hover:overflow-visible" style={{maxWidth: '100%'}}>{error}</p>
      </div>
    );
  }

  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    // This case might occur if rendering finished but produced invalid dimensions, or if error is null but dimensions are also null.
    return (
      <div
        className={cn(
            "flex flex-col items-center justify-center bg-muted/20 border border-border text-muted-foreground rounded-md p-2 text-xs text-center transition-all",
            className
        )}
        style={{ height: `${currentDisplayHeight}px`, width: `${estimatedWidth}px` }}
        aria-label={`Preview for page ${pageIndex + 1} is unavailable or has invalid dimensions`}
      >
        <FileWarning className="h-5 w-5 mb-1 flex-shrink-0" />
        <p className="leading-tight">Page {pageIndex + 1}: Preview N/A</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("border border-muted shadow-sm rounded-md bg-white transition-all max-w-full max-h-full object-contain", className)}
      style={{
        display: 'block',
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
      }}
      role="img"
      aria-label={`Preview of PDF page ${pageIndex + 1}`}
    />
  );
};

export default PdfPagePreview;
