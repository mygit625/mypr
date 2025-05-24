
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import the worker entry point. This is typically what bundlers use to create a separate worker chunk.
import pdfWorkerEntryPoint from 'pdfjs-dist/build/pdf.worker.entry.mjs';

// CRITICAL DIAGNOSTIC LOGS:
console.log('[PdfPagePreview] Imported pdfjsLib object:', pdfjsLib);
const importedApiVersion = pdfjsLib.version;
console.log('[PdfPagePreview] Imported pdfjsLib.version:', importedApiVersion);
console.log('[PdfPagePreview] Imported pdfWorkerEntryPoint:', pdfWorkerEntryPoint);
console.log('[PdfPagePreview] Type of pdfWorkerEntryPoint:', typeof pdfWorkerEntryPoint);


// Setup workerSrc using the imported entry point.
// This should only run once in the browser.
if (typeof window !== 'undefined') {
    // Check if workerSrc is already set, to avoid issues if module re-evaluates
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== pdfWorkerEntryPoint) {
        console.log('[PdfPagePreview] Setting pdfjsLib.GlobalWorkerOptions.workerSrc to imported pdf.worker.entry.mjs.');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerEntryPoint;
        console.log('[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc is now set to:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    } else {
        console.log('[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc was already set to the imported worker entry point.');
    }
} else {
    console.log('[PdfPagePreview] Skipping workerSrc setup (not in browser environment).');
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
  console.log(`${logPrefix} CURRENT CHECK: pdfjsLib.version (at render time): ${pdfjsLib.version}, GlobalWorkerOptions.workerSrc type: ${typeof pdfjsLib.GlobalWorkerOptions.workerSrc}, value: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);


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

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc && typeof window !== 'undefined') {
    console.error(`${logPrefix} PDF.js workerSrc not configured! This is a critical error. Current workerSrc: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
    console.warn(`${logPrefix} Re-attempting to set workerSrc using imported module as it was not found during render.`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerEntryPoint; // Re-assign with the entry point
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        throw new Error(`${logPrefix} PDF.js workerSrc still not configured after re-attempt during render.`);
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
      throw new Error(`${logPrefix} Page viewport@1 has invalid dimensions (H:${viewportAtScale1.height} W:${viewportAtScale1.width}). Page might be empty or corrupt.`);
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

    const RENDER_TIMEOUT = 15000; 
    const renderContext: RenderParameters = { canvasContext: context, viewport: viewport };
    const renderTask = page.render(renderContext);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${logPrefix} Render timed out for page ${pageIndex + 1} after ${RENDER_TIMEOUT/1000}s`)), RENDER_TIMEOUT)
    );

    await Promise.race([renderTask.promise, timeoutPromise]);
    console.log(`${logPrefix} Render task completed for page ${pageIndex + 1}.`);
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
  const [originalImportedVersion, setOriginalImportedVersion] = useState<string | null>(null);

  useEffect(() => {
    setOriginalImportedVersion(importedApiVersion);
  }, []);

  useEffect(() => {
    let isActive = true;
    const canvasElement = canvasRef.current;
    const logPrefix = `${stableInstanceLogPrefix}-eff`;

    const initRender = async () => {
      if (!pdfDataUri) {
        if (isActive) {
          console.log(`${logPrefix} No PDF data URI provided for page ${pageIndex + 1}.`);
          setRenderError("No PDF data provided.");
          setIsLoading(false);
        }
        return;
      }

      if (!canvasElement) {
        console.log(`${logPrefix} Canvas ref not current for page ${pageIndex + 1}. Will show loading. Effect might re-run if canvas becomes available.`);
        if (isActive && !isLoading) setIsLoading(true); // Ensure loading is true if canvas isn't ready
        return;
      }
      
      console.log(`${logPrefix} Attempting render for page ${pageIndex + 1}. URI starts: ${pdfDataUri.substring(0,30)}..., Canvas available: ${!!canvasElement}`);
      if (isActive) {
         setIsLoading(true); 
         setRenderError(null);
      }

      try {
        const outputDimensions = await renderPdfPageToCanvas(
          canvasElement,
          pdfDataUri,
          pageIndex,
          rotation,
          targetHeight,
          `${logPrefix}-render`
        );
        if (isActive) {
          console.log(`${logPrefix} Render successful for page ${pageIndex + 1}. Output dimensions:`, outputDimensions);
        }
      } catch (err: any) {
        console.error(`${logPrefix} Error in renderPdfPageToCanvas for page ${pageIndex + 1}:`, err.message);
        if (isActive) {
          if (err.message && err.message.includes("The API version") && err.message.includes("does not match the Worker version")) {
            const apiV = err.message.match(/API version "([^"]+)"/)?.[1] || originalImportedVersion || "unknown";
            const workerV = err.message.match(/Worker version "([^"]+)"/)?.[1] || (typeof pdfjsLib.GlobalWorkerOptions.workerSrc === 'string' && pdfjsLib.GlobalWorkerOptions.workerSrc.includes('/') ? pdfjsLib.GlobalWorkerOptions.workerSrc.split('/').find(s => s.match(/\d+\.\d+\.\d+/)) : "unknown_worker_setup");
            setRenderError(`PDF Library Version Mismatch! App's PDF API: v${apiV}, Worker: v${workerV}. This usually indicates an environment setup issue if versions differ from package.json.`);
          } else {
            setRenderError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
          }
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };
    
    // Add a small delay to give the canvas ref a moment to attach, especially on initial load or complex UIs.
    const timerId = setTimeout(() => {
        if (isActive) initRender();
    }, 150); // Slightly increased delay

    return () => {
      isActive = false;
      clearTimeout(timerId);
      console.log(`${logPrefix} Cleanup for page ${pageIndex + 1}.`);
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, stableInstanceLogPrefix, isLoading, originalImportedVersion]);

  const estimatedWidth = targetHeight * (210 / 297); // A4 aspect ratio for placeholder

  let errorDisplay = null;
  if (renderError) {
      errorDisplay = (
         <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 border border-destructive/50 text-destructive-foreground rounded-md p-1 text-xs text-center pointer-events-none"
            title={renderError}
          >
            <FileWarning className="h-4 w-4 mb-0.5 flex-shrink-0" />
            <p className="leading-tight text-[10px]">{renderError}</p>
          </div>
      );
  }
  
  return (
    <div 
      className={cn("relative bg-transparent overflow-hidden flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-md", className)}
      style={{ 
        height: `${targetHeight}px`, 
        width: `auto`, 
        minWidth: `${Math.max(50, Math.round(estimatedWidth * 0.5))}px`, 
        maxWidth: `${Math.max(100, Math.round(estimatedWidth * 2))}px` 
      }}
    >
      <canvas
        ref={canvasRef}
        className={cn("border border-muted shadow-sm rounded-md bg-white transition-opacity duration-300", {
          'opacity-0': isLoading || !!renderError || !pdfDataUri, 
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
      
      {isLoading && !renderError && pdfDataUri && (
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

      {errorDisplay}

       {(!pdfDataUri && !isLoading && !renderError) && ( 
         <Skeleton
            className={cn("rounded-md bg-muted/30 w-full h-full")}
            aria-label={`No PDF loaded for page ${pageIndex + 1} preview`}
        />
       )}
    </div>
  );
};

export default PdfPagePreview;

