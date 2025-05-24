
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
  // This log confirms the version of pdfjsLib being used at the point of rendering.
  // The error "API version X does not match Worker version Y" comes from an internal check within getDocument.
  console.log(`${logPrefix} pdfjsLib.version at render time: ${pdfjsLib.version}, PDF_JS_VERSION_CONSTANT: ${PDF_JS_VERSION}, GlobalWorkerOptions.workerSrc: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);

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
    if (typeof window !== 'undefined') {
        const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
        console.warn(`${logPrefix} Re-attempting to set workerSrc as it was not found.`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
    }
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        throw new Error(`${logPrefix} PDF.js workerSrc still not configured after re-attempt.`);
    }
  }

  const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
  let pdf: PDFDocumentProxy | null = null;

  try {
    pdf = await loadingTask.promise;
    console.log(`${logPrefix} PDF loaded. Total pages: ${pdf.numPages}. Target page: ${pageIndex + 1}.`);

    if (pageIndex < 0 || pageIndex >= pdf.numPages) {
      throw new Error(`${logPrefix} Page index ${pageIndex + 1} out of bounds (Total: ${pdf.numPages}).`);
    }

    const page: PDFPageProxy = await pdf.getPage(pageIndex + 1);
    const dynamicRotation = (rotation || 0);
    const totalRotationForViewport = (page.rotate + dynamicRotation + 360) % 360;
    
    const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotationForViewport });
    if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
      throw new Error(`${logPrefix} Page viewport@1 has invalid dimensions (H:${viewportAtScale1.height} W:${viewportAtScale1.width}).`);
    }

    const scale = targetHeight / viewportAtScale1.height;
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error(`${logPrefix} Invalid scale: ${scale.toFixed(4)}. TargetH: ${targetHeight}, ViewportH@1: ${viewportAtScale1.height}`);
    }

    const viewport = page.getViewport({ scale, rotation: totalRotationForViewport });
    if (viewport.width <= 0 || viewport.height <= 0) {
      throw new Error(`${logPrefix} Final viewport has invalid dimensions (W:${viewport.width.toFixed(2)} H:${viewport.height.toFixed(2)}).`);
    }
    
    const context = canvas.getContext('2d');
    if (!context) throw new Error(`${logPrefix} Could not get canvas 2D context for page ${pageIndex + 1}.`);

    const newCanvasWidth = Math.max(1, Math.round(viewport.width));
    const newCanvasHeight = Math.max(1, Math.round(viewport.height));
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.height = newCanvasHeight;
    canvas.width = newCanvasWidth;

    const RENDER_TIMEOUT = 15000; // 15 seconds
    const renderContext: RenderParameters = { canvasContext: context, viewport: viewport };
    const renderTask = page.render(renderContext);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${logPrefix} Render timed out for page ${pageIndex + 1} after ${RENDER_TIMEOUT/1000}s`)), RENDER_TIMEOUT)
    );

    await Promise.race([renderTask.promise, timeoutPromise]);
    try { page.cleanup(); } catch (cleanupError) { console.warn(`${logPrefix} Error during page cleanup for page ${pageIndex + 1}:`, cleanupError); }
    return { width: newCanvasWidth, height: newCanvasHeight };

  } finally {
    if (pdf && typeof (pdf as any).destroy === 'function') {
      try { await (pdf as any).destroy(); } catch (destroyError) { console.warn(`${logPrefix} Error destroying PDF doc:`, destroyError); }
    } else if (loadingTask && typeof (loadingTask as any).destroy === 'function' && !pdf) {
      (loadingTask as any).destroy();
      console.log(`${logPrefix} Destroying loading task because PDF object was not created or promise rejected early.`);
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
  const [isLoading, setIsLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const stableInstanceLogPrefix = useRef(`pdf-pv-${pageIndex}-${Math.random().toString(36).substring(2, 7)}`).current;

  useEffect(() => {
    let isActive = true;
    const canvasElement = canvasRef.current;
    const logPrefix = `${stableInstanceLogPrefix}-eff`;

    if (!pdfDataUri) {
      if (isActive) {
        setRenderError("No PDF data provided.");
        setIsLoading(false);
      }
      return;
    }

    if (!canvasElement) {
       console.log(`${logPrefix} Canvas ref not current. Will show loading. Effect might re-run if canvas becomes available.`);
      if (isActive && !isLoading) setIsLoading(true);
      return;
    }
    
    if (isActive) {
      setIsLoading(true);
      setRenderError(null);
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
          setRenderError(null);
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
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, stableInstanceLogPrefix]); // stableInstanceLogPrefix is stable

  const estimatedWidth = targetHeight * (210 / 297);

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
          'opacity-0': isLoading || renderError || !pdfDataUri, 
          'opacity-100': !isLoading && !renderError && pdfDataUri,
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
      
      {isLoading && pdfDataUri && (
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

      {renderError && !isLoading && pdfDataUri && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 border border-destructive/50 text-destructive-foreground rounded-md p-1 text-xs text-center pointer-events-none"
          title={renderError}
        >
          <FileWarning className="h-4 w-4 mb-0.5 flex-shrink-0" />
          <p className="leading-tight text-[10px]">Page {pageIndex + 1}: Error</p>
        </div>
      )}

       {(!pdfDataUri && !isLoading) && ( 
         <Skeleton
            className={cn("rounded-md bg-muted/30 border border-dashed w-full h-full", className)}
            aria-label={`No PDF loaded for page ${pageIndex + 1} preview`}
        />
       )}
    </div>
  );
};

export default PdfPagePreview;
