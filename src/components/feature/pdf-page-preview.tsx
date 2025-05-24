
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

const PDF_JS_VERSION = "4.4.168"; // Ensure this matches your installed pdfjs-dist version

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
  logPrefix: string
): Promise<RenderOutput> {
  console.log(`${logPrefix} renderPdfPageToCanvas: Starting for page ${pageIndex + 1}, targetH: ${targetHeight}, rotation: ${rotation}`);

  const base64Marker = ';base64,';
  const base64Index = pdfDataUri.indexOf(base64Marker);
  if (base64Index === -1) throw new Error(`${logPrefix} Invalid PDF data URI format.`);

  const pdfBase64Data = pdfDataUri.substring(base64Index + base64Marker.length);
  let pdfBinaryData: string;
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
    console.error(`${logPrefix} PDF.js workerSrc not configured! This is a critical error.`);
    throw new Error(`${logPrefix} PDF.js workerSrc not configured.`);
  }

  console.log(`${logPrefix} Calling pdfjsLib.getDocument() for page ${pageIndex + 1}`);
  const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
  let pdf: PDFDocumentProxy | null = null;

  try {
    pdf = await loadingTask.promise;
    console.log(`${logPrefix} PDF loaded. Total pages: ${pdf.numPages}. Target page: ${pageIndex + 1}`);

    if (pageIndex < 0 || pageIndex >= pdf.numPages) {
      throw new Error(`${logPrefix} Page index ${pageIndex + 1} out of bounds (Total: ${pdf.numPages}).`);
    }

    const page: PDFPageProxy = await pdf.getPage(pageIndex + 1);
    console.log(`${logPrefix} Page ${pageIndex + 1} obtained. Intrinsic rotation: ${page.rotate}`);
    
    const dynamicRotation = (rotation || 0); // Use dynamic rotation directly
    const totalRotationForViewport = (page.rotate + dynamicRotation + 360) % 360;
    console.log(`${logPrefix} Total rotation for viewport: ${totalRotationForViewport} (Intrinsic: ${page.rotate}, Dynamic: ${dynamicRotation})`);
    
    const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotationForViewport });
    if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
      throw new Error(`${logPrefix} Page viewport@1 has invalid dimensions (H:${viewportAtScale1.height} W:${viewportAtScale1.width}).`);
    }

    const scale = targetHeight / viewportAtScale1.height;
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error(`${logPrefix} Invalid scale: ${scale.toFixed(4)}. TargetH: ${targetHeight}, ViewportH@1: ${viewportAtScale1.height}`);
    }
    console.log(`${logPrefix} Calculated scale: ${scale.toFixed(4)} for page ${pageIndex + 1}`);

    const viewport = page.getViewport({ scale, rotation: totalRotationForViewport });
    if (viewport.width <= 0 || viewport.height <= 0) {
      throw new Error(`${logPrefix} Final viewport has invalid dimensions (W:${viewport.width.toFixed(2)} H:${viewport.height.toFixed(2)}).`);
    }
    console.log(`${logPrefix} Viewport for render: W=${viewport.width.toFixed(2)}, H=${viewport.height.toFixed(2)} for page ${pageIndex + 1}`);
    
    const context = canvas.getContext('2d');
    if (!context) throw new Error(`${logPrefix} Could not get canvas 2D context for page ${pageIndex + 1}.`);

    const newCanvasWidth = Math.max(1, Math.round(viewport.width));
    const newCanvasHeight = Math.max(1, Math.round(viewport.height));
    canvas.height = newCanvasHeight;
    canvas.width = newCanvasWidth;
    console.log(`${logPrefix} Canvas attributes set: W=${canvas.width}, H=${canvas.height} for page ${pageIndex + 1}.`);

    const RENDER_TIMEOUT = 15000;
    const renderContext: RenderParameters = { canvasContext: context, viewport: viewport };
    const renderTask = page.render(renderContext);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${logPrefix} Render timed out for page ${pageIndex + 1} after ${RENDER_TIMEOUT/1000}s`)), RENDER_TIMEOUT)
    );

    console.log(`${logPrefix} Starting page.render() for page ${pageIndex + 1}`);
    await Promise.race([renderTask.promise, timeoutPromise]);
    console.log(`${logPrefix} page.render() COMPLETED SUCCESSFULLY for page ${pageIndex + 1}.`);

    try { page.cleanup(); } catch (cleanupError) { console.warn(`${logPrefix} Error during page cleanup for page ${pageIndex + 1}:`, cleanupError); }
    return { width: newCanvasWidth, height: newCanvasHeight };

  } finally {
    if (pdf && typeof (pdf as any).destroy === 'function') {
      console.log(`${logPrefix} Destroying PDF document object.`);
      try { await (pdf as any).destroy(); } catch (destroyError) { console.warn(`${logPrefix} Error destroying PDF doc:`, destroyError); }
    } else if (loadingTask && typeof (loadingTask as any).destroy === 'function') {
      console.log(`${logPrefix} Destroying loading task if PDF object was not created.`);
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
  const [loading, setLoading] = useState(true); // Start in loading state
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const instanceLogPrefix = useRef(`pdf-pv-${pageIndex}-${Math.random().toString(36).substring(2, 5)}`).current;

  useEffect(() => {
    let isActive = true;
    const currentCanvas = canvasRef.current;
    const renderAttemptLogPrefix = `${instanceLogPrefix}-try-${Math.random().toString(36).substring(2, 7)}`;

    console.log(`${renderAttemptLogPrefix} useEffect triggered. PageIdx: ${pageIndex}, pdfDataUri: ${pdfDataUri ? 'present' : 'null'}, Canvas available: ${!!currentCanvas}, Rotation: ${rotation}, TargetHeight: ${targetHeight}`);

    if (!pdfDataUri) {
      console.log(`${renderAttemptLogPrefix} No pdfDataUri. Clearing state.`);
      if (isActive) {
        setError("No PDF data provided.");
        setLoading(false);
        setDimensions(null);
      }
      return;
    }

    if (!currentCanvas) {
      console.log(`${renderAttemptLogPrefix} Canvas ref not current. Current loading state: ${loading}. Component will wait for ref.`);
      // Ensure loading is true if canvas is not ready, parent might re-render.
      // If not already loading, set it to true to show skeleton.
      if (isActive && !loading) setLoading(true); 
      return;
    }
    
    // If we have pdfDataUri and currentCanvas, proceed to render.
    // Reset error/dimensions from previous attempts for this instance if URI/params change.
    if(isActive) {
        setError(null);
        setDimensions(null);
        if (!loading) setLoading(true); // Ensure loading is true before async operation
    }

    const initRender = async () => {
      console.log(`${renderAttemptLogPrefix} initRender: Starting actual render logic.`);
      try {
        const context = currentCanvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
          console.log(`${renderAttemptLogPrefix} Canvas cleared before rendering.`);
        }

        const resultDimensions = await renderPdfPageToCanvas(
          currentCanvas,
          pdfDataUri,
          pageIndex,
          rotation,
          targetHeight,
          renderAttemptLogPrefix
        );
        if (isActive) {
          console.log(`${renderAttemptLogPrefix} Render successful. Dimensions:`, resultDimensions);
          setDimensions(resultDimensions);
          setError(null);
        }
      } catch (err: any) {
        console.error(`${renderAttemptLogPrefix} Error in initRender/renderPdfPageToCanvas:`, err.message, err.stack ? err.stack.substring(0,300) : '');
        if (isActive) {
          setError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
          setDimensions(null);
        }
      } finally {
        if (isActive) {
          console.log(`${renderAttemptLogPrefix} initRender finished. Setting loading=false.`);
          setLoading(false);
        }
      }
    };

    initRender();

    return () => {
      console.log(`${renderAttemptLogPrefix} useEffect cleanup for pageIdx ${pageIndex}. isActive=false.`);
      isActive = false;
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, instanceLogPrefix, loading]); // Added loading to dep array cautiously.

  const currentDisplayHeight = targetHeight;
  const estimatedWidth = dimensions ? dimensions.width : Math.max(50, targetHeight * (210 / 297)); // A4 aspect ratio

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
        style={{ height: `${currentDisplayHeight}px`, width: `${Math.max(80, estimatedWidth)}px` }}
        title={error}
      >
        <FileWarning className="h-5 w-5 mb-1 flex-shrink-0" />
        <p className="leading-tight">Page {pageIndex + 1}: Error</p>
        <p className="leading-tight opacity-80 truncate hover:whitespace-normal hover:overflow-visible" style={{maxWidth: '100%'}}>{error}</p>
      </div>
    );
  }
  
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
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

    