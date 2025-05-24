
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// CRITICAL DIAGNOSTIC LOG: Please check your browser console for this message and report the version.
console.log('[PdfPagePreview] Imported pdfjsLib.version:', pdfjsLib.version);
console.log('[PdfPagePreview] pdfjsLib object:', pdfjsLib);


const PDF_JS_VERSION = "4.4.168"; // This MUST match your installed pdfjs-dist version from package.json
let pdfJsWorkerInitialized = false;

if (typeof window !== 'undefined' && !pdfJsWorkerInitialized) {
  try {
    const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
    console.log(`[PdfPagePreview] Attempting to set pdfjsLib.GlobalWorkerOptions.workerSrc to: ${cdnPath} (using PDF_JS_VERSION: ${PDF_JS_VERSION})`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
    pdfJsWorkerInitialized = true;
    console.log(`[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc is now: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
  } catch (e) {
    console.error("[PdfPagePreview] Error setting workerSrc:", e);
  }
} else if (typeof window !== 'undefined' && pdfJsWorkerInitialized) {
    console.log('[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc was already initialized.');
} else {
    console.log('[PdfPagePreview] Skipping workerSrc setup (not in browser environment or already initialized).');
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
  // ADDED DIAGNOSTIC LOGS:
  console.log(`${logPrefix} CURRENT CHECK: pdfjsLib.version: ${pdfjsLib.version}, PDF_JS_VERSION_CONSTANT: ${PDF_JS_VERSION}, GlobalWorkerOptions.workerSrc: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);


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
    console.error(`${logPrefix} PDF.js workerSrc not configured! This is a critical error. Current workerSrc: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
    // Attempt to re-set it if it's somehow missing, though the module-level init should handle this.
    if (typeof window !== 'undefined') {
        const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
        console.warn(`${logPrefix} Re-attempting to set workerSrc as it was not found.`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
    }
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) { // Check again
        throw new Error(`${logPrefix} PDF.js workerSrc still not configured after re-attempt.`);
    }
  } else {
     console.log(`${logPrefix} PDF.js workerSrc is confirmed configured to: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
  }

  console.log(`${logPrefix} Calling pdfjsLib.getDocument() for page ${pageIndex + 1}. Imported API version: ${pdfjsLib.version}`);
  const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
  let pdf: PDFDocumentProxy | null = null;

  try {
    pdf = await loadingTask.promise;
    console.log(`${logPrefix} PDF loaded. Total pages: ${pdf.numPages}. Target page: ${pageIndex + 1}.`);

    if (pageIndex < 0 || pageIndex >= pdf.numPages) {
      throw new Error(`${logPrefix} Page index ${pageIndex + 1} out of bounds (Total: ${pdf.numPages}).`);
    }

    const page: PDFPageProxy = await pdf.getPage(pageIndex + 1);
    console.log(`${logPrefix} Page ${pageIndex + 1} obtained. Intrinsic rotation: ${page.rotate}`);
    
    const dynamicRotation = (rotation || 0); 
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
    
    context.clearRect(0, 0, canvas.width, canvas.height); // Clear before resizing

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

    try { page.cleanup(); } catch (cleanupError) { console.warn(`${logPrefix} Error during page cleanup for page ${pageIndex + 1}:`, cleanupError); }
    return { width: newCanvasWidth, height: newCanvasHeight };

  } finally {
    if (pdf && typeof (pdf as any).destroy === 'function') {
      console.log(`${logPrefix} Destroying PDF document object.`);
      try { await (pdf as any).destroy(); } catch (destroyError) { console.warn(`${logPrefix} Error destroying PDF doc:`, destroyError); }
    } else if (loadingTask && typeof (loadingTask as any).destroy === 'function' && !pdf) {
      console.log(`${logPrefix} Destroying loading task because PDF object was not created or promise rejected early.`);
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
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [renderError, setRenderError] = useState<string | null>(null);
  // Stable prefix for logging related to this specific component instance
  const stableInstanceLogPrefix = useRef(`pdf-pv-${pageIndex}-${Math.random().toString(36).substring(2, 7)}`).current;

  useEffect(() => {
    let isActive = true;
    const canvasElement = canvasRef.current;
    const logPrefix = `${stableInstanceLogPrefix}-eff`;

    console.log(`${logPrefix} useEffect triggered. PageIdx: ${pageIndex}. CanvasEl: ${canvasElement ? 'yes' : 'no'}. PDF: ${pdfDataUri ? 'yes' : 'no'}. Current loading: ${isLoading}`);

    if (!pdfDataUri) {
      console.log(`${logPrefix} No pdfDataUri. Setting error state and ensuring loading is false.`);
      if (isActive) {
        setRenderError("No PDF data provided.");
        setIsLoading(false);
      }
      return;
    }

    if (!canvasElement) {
      console.log(`${logPrefix} Canvas element not available yet. Current loading: ${isLoading}. Will wait for ref.`);
      // Ensure loading is true if canvas isn't ready, might already be true from initial state.
      if (isActive && !isLoading) setIsLoading(true); 
      return;
    }
    
    // At this point, pdfDataUri and canvasElement are available. Start loading process.
    if (isActive) {
      setIsLoading(true); // Ensure loading is true before async operation
      setRenderError(null); // Clear previous errors
    }

    renderPdfPageToCanvas(
        canvasElement,
        pdfDataUri,
        pageIndex,
        rotation,
        targetHeight,
        `${logPrefix}-render`
      )
      .then((outputDimensions) => {
        if (isActive) {
          console.log(`${logPrefix} Render successful for page ${pageIndex + 1}. Output dimensions:`, outputDimensions);
          setRenderError(null); // Clear error on success
        }
      })
      .catch(err => {
        console.error(`${logPrefix} Error in renderPdfPageToCanvas for page ${pageIndex + 1}:`, err.message);
        if (isActive) {
          setRenderError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
        }
      })
      .finally(() => {
        if (isActive) {
          console.log(`${logPrefix} Render attempt finished for page ${pageIndex + 1}. Setting isLoading=false.`);
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
      console.log(`${logPrefix} useEffect cleanup for pageIdx ${pageIndex}.`);
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, stableInstanceLogPrefix]); 

  const estimatedWidth = targetHeight * (210 / 297); // A4 aspect ratio (approx)

  return (
    <div 
      className={cn("relative bg-transparent overflow-hidden flex items-center justify-center", className)}
      style={{ 
        height: `${targetHeight}px`, 
        width: `auto`, 
        minWidth: `${Math.max(50, estimatedWidth / 2)}px`, 
        maxWidth: `${Math.max(100, estimatedWidth * 1.5)}px` 
      }}
    >
      <canvas
        ref={canvasRef}
        className={cn("border border-muted shadow-sm rounded-md bg-white transition-opacity duration-300", {
          'opacity-0': isLoading || renderError, 
          'opacity-100': !isLoading && !renderError,
        })}
        style={{
          display: 'block', 
          maxWidth: '100%', 
          maxHeight: '100%',
          objectFit: 'contain', 
        }}
        role="img"
        aria-label={`Preview of PDF page ${pageIndex + 1}`}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Skeleton
                className="rounded-md bg-muted/50"
                style={{ 
                  height: `calc(100% - 2px)`, 
                  width: `calc(100% - 2px)`   
                }}
                aria-label={`Loading preview for page ${pageIndex + 1}`}
            />
        </div>
      )}

      {renderError && !isLoading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 border border-destructive/50 text-destructive-foreground rounded-md p-1 text-xs text-center pointer-events-none"
          title={renderError}
        >
          <FileWarning className="h-4 w-4 mb-0.5 flex-shrink-0" />
          <p className="leading-tight text-[10px]">Page {pageIndex + 1}: Error</p>
        </div>
      )}

       {!pdfDataUri && !isLoading && !renderError && ( 
         <Skeleton
            className={cn("rounded-md bg-muted/30 border border-dashed", className)}
            style={{ 
                height: `calc(100% - 2px)`,
                width: `calc(100% - 2px)`
            }}
            aria-label={`No PDF loaded for page ${pageIndex + 1} preview`}
        />
       )}
    </div>
  );
};

export default PdfPagePreview;
