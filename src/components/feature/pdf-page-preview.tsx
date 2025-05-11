"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// Initialize workerSrc once on the client side when the module loads.
if (typeof window !== 'undefined') {
  const PDF_JS_VERSION = "4.4.168"; // Ensure this matches the installed pdfjs-dist version
  const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
  // Only set it if it's not already set or different, to avoid potential issues if set multiple times.
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

// This function contains the core PDF rendering logic.
// It does not interact with React state directly.
async function renderPdfPageToCanvas(
  canvas: HTMLCanvasElement,
  pdfDataUri: string,
  pageIndex: number,
  rotation: number,
  targetHeight: number,
  logPrefix: string
): Promise<RenderOutput> {
  console.log(`${logPrefix} renderPdfPageToCanvas: Starting for page ${pageIndex + 1}`);

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
  const pdf: PDFDocumentProxy = await loadingTask.promise;
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

  // Ensure canvas dimensions are at least 1x1
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
  
  // Clean up
  try {
    page.cleanup();
    // pdf.destroy() should be called when the PDF document is no longer needed,
    // typically when the component unmounts or pdfDataUri changes.
    // However, if multiple previews use the same pdfDataUri, destroying it here would be premature.
    // For now, we'll rely on loadingTask.destroy() or a higher-level cleanup if pdfDataUri changes.
    if (loadingTask && typeof (loadingTask as any).destroy === 'function') {
      (loadingTask as any).destroy();
    }
  } catch (cleanupError) {
    console.warn(`${logPrefix} Error during page cleanup for page ${pageIndex + 1}:`, cleanupError);
  }


  return { width: newCanvasWidth, height: newCanvasHeight };
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
  
  // Unique ID for logging, helps distinguish between multiple instances or re-renders.
  const instanceId = useRef(`pdf-pv-${pageIndex}-${Math.random().toString(36).substring(2, 5)}`).current;
  const logPrefix = `PdfPrev[${instanceId}](pg:${pageIndex + 1},rot:${rotation}):`;

  useEffect(() => {
    let isActive = true; // Flag to prevent state updates if component unmounts or deps change
    console.log(`${logPrefix} useEffect triggered. pdfDataUri available: ${!!pdfDataUri}. Canvas available: ${!!canvasRef.current}`);

    const initRender = async () => {
      if (!canvasRef.current) {
        console.log(`${logPrefix} Canvas not available yet. Will remain in loading state.`);
        // setLoading(true) is initial state, so this just confirms we wait.
        return; 
      }
      
      // Ensure loading is true at the start of an attempt and error is reset.
      if (isActive) {
        console.log(`${logPrefix} Setting loading=true, error=null`);
        setLoading(true);
        setError(null);
        setDimensions(null); // Clear previous dimensions
        
        // Clear canvas before new render attempt
        const context = canvasRef.current.getContext('2d');
        if (context) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            console.log(`${logPrefix} Canvas cleared.`);
        } else {
            console.warn(`${logPrefix} Could not get context to clear canvas.`);
        }
      }

      try {
        // pdfDataUri is guaranteed to be non-null here due to the outer if block.
        const resultDimensions = await renderPdfPageToCanvas(
            canvasRef.current, 
            pdfDataUri!, 
            pageIndex, 
            rotation, 
            targetHeight,
            logPrefix 
        );
        if (isActive) {
            console.log(`${logPrefix} Render successful. Setting dimensions:`, resultDimensions);
            setDimensions(resultDimensions);
            setError(null); // Explicitly clear error on success
        } else {
            console.log(`${logPrefix} Render successful but component no longer active. Skipping state update.`);
        }
      } catch (err: any) {
        console.error(`${logPrefix} Error during renderPdfPageToCanvas call:`, err.message, err.stack ? err.stack.substring(0,300) : '');
        if (isActive) {
            setError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
            setDimensions(null);
        } else {
            console.log(`${logPrefix} Error occurred but component no longer active. Skipping error state update.`);
        }
      } finally {
        if (isActive) {
            console.log(`${logPrefix} Setting loading=false in finally block.`);
            setLoading(false);
        } else {
            console.log(`${logPrefix} In finally block, but component no longer active. Skipping setLoading(false).`);
        }
      }
    };

    if (!pdfDataUri) {
      console.log(`${logPrefix} No pdfDataUri. Clearing state.`);
      if (isActive) {
        setLoading(false); // Not loading if no data
        setError("No PDF data provided.");
        setDimensions(null);
      }
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) context.clearRect(0, 0, canvas.width, canvas.height);
      }
      return; // Exit effect if no PDF data
    }
    
    // If canvasRef is not yet available, the effect will re-run when it is.
    // We keep loading true (initial state or set by previous branches if pdfDataUri was null).
    if (!canvasRef.current) {
        console.log(`${logPrefix} Canvas ref not current. Effect will re-run. Ensuring loading is true.`);
        if (isActive && !loading) setLoading(true); // Ensure loading is true if canvas is not ready.
        return;
    }

    initRender();

    return () => {
      console.log(`${logPrefix} Cleanup: setting isActive=false.`);
      isActive = false;
      // Potentially, if a PDF document object (`pdf`) was stored from `getDocument`,
      // its `destroy()` method could be called here if this preview instance
      // was the sole owner or if ref counting was implemented.
      // For now, `renderPdfPageToCanvas` handles `loadingTask.destroy()`.
    };
  // Dependencies: if any of these change, the effect re-runs for a new render.
  // logPrefix is included because it changes if pageIndex or rotation changes, semantically grouping them.
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [pdfDataUri, pageIndex, rotation, targetHeight, logPrefix]); 
  // Note: `loading` was removed from deps, `useEffect` manages its cycle.

  const currentDisplayHeight = targetHeight;
  // Estimate width for skeleton/error before dimensions are known, using A4-like aspect ratio.
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
        style={{ height: `${currentDisplayHeight}px`, width: `${estimatedWidth}px` }}
        title={error} 
      >
        <FileWarning className="h-5 w-5 mb-1 flex-shrink-0" />
        <p className="leading-tight">Page {pageIndex + 1}: Error</p>
        <p className="leading-tight opacity-80 truncate_ sm:block">{error.length > 40 ? error.substring(0, 40) + '...' : error}</p>
      </div>
    );
  }
  
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    // This state should ideally be covered by error or loading, but as a fallback:
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
      className={cn("border border-muted shadow-sm rounded-md bg-white transition-all", className)}
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
