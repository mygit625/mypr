
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// CRITICAL DIAGNOSTIC LOGS:
console.log('[PdfPagePreview] Imported pdfjsLib object:', pdfjsLib);
const importedApiVersion = pdfjsLib.version; // Capture the version from the imported library
console.log('[PdfPagePreview] Version of imported pdfjsLib:', importedApiVersion);

const EXPECTED_PDF_JS_VERSION_FROM_PACKAGE_JSON = "4.4.168"; // For reference to package.json expectation

// Setup workerSrc dynamically based on the version of the imported pdfjsLib.
// This attempts to ensure API and Worker versions match.
// WARNING: If importedApiVersion is non-standard (e.g., "4.10.38"),
// this CDN URL for the worker might be invalid and lead to a 404 error.
if (typeof window !== 'undefined' && importedApiVersion) {
    const dynamicWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${importedApiVersion}/pdf.worker.min.mjs`;
    console.log(`[PdfPagePreview] Attempting to set pdfjsLib.GlobalWorkerOptions.workerSrc to: ${dynamicWorkerSrc} (based on imported API version: ${importedApiVersion})`);
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== dynamicWorkerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = dynamicWorkerSrc;
        console.log('[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc dynamically SET.');
    } else {
        console.log('[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc was already dynamically set.');
    }
} else if (typeof window !== 'undefined') {
    console.warn('[PdfPagePreview] importedApiVersion is not available. Falling back to expected version for workerSrc. This might cause version mismatch.');
    const fallbackWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${EXPECTED_PDF_JS_VERSION_FROM_PACKAGE_JSON}/pdf.worker.min.mjs`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = fallbackWorkerSrc;
    console.log(`[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc set to fallback: ${fallbackWorkerSrc}`);
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
  console.log(`${logPrefix} CURRENT CHECK: pdfjsLib.version (at render time): ${pdfjsLib.version}, GlobalWorkerOptions.workerSrc value: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);

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
    console.error(`${logPrefix} PDF.js workerSrc not configured at render time! This is unexpected.`);
    // This should ideally not happen if the top-level setup worked.
    const dynamicFallbackWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = dynamicFallbackWorkerSrc;
     console.warn(`${logPrefix} Re-attempting to set workerSrc to ${dynamicFallbackWorkerSrc} as it was not found during render.`);
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

    const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); // 1-indexed
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
  // Use the module-level 'importedApiVersion' for error messages
  const currentImportedApiVersion = importedApiVersion; 

  const stableInstanceLogPrefix = useRef(`pdf-pv-${pageIndex}-${Math.random().toString(36).substring(2, 7)}`).current;

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
        if (isActive) {
           console.log(`${logPrefix} Canvas ref not current yet for page ${pageIndex + 1}. Will show loading. Effect might re-run.`);
           if(!isLoading) setIsLoading(true); 
        }
        return;
      }
      
      console.log(`${logPrefix} Attempting render for page ${pageIndex + 1}. URI starts: ${pdfDataUri.substring(0,30)}..., Canvas available: ${!!canvasElement}`);
      if (isActive) {
         setIsLoading(true); 
         setRenderError(null);
      }

      try {
        await renderPdfPageToCanvas(
          canvasElement,
          pdfDataUri,
          pageIndex,
          rotation,
          targetHeight,
          `${logPrefix}-render`
        );
        if (isActive) {
          console.log(`${logPrefix} Render successful for page ${pageIndex + 1}.`);
        }
      } catch (err: any) {
        console.error(`${logPrefix} Error in renderPdfPageToCanvas for page ${pageIndex + 1}:`, err.message);
        if (isActive) {
          setRenderError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };
    
    const timerId = setTimeout(() => {
        if (isActive) initRender();
    }, 150);

    return () => {
      isActive = false;
      clearTimeout(timerId);
      console.log(`${logPrefix} Cleanup for page ${pageIndex + 1}.`);
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, stableInstanceLogPrefix, isLoading]);


  const estimatedWidth = targetHeight * (210 / 297); 

  let errorDisplay = null;
  if (renderError) {
      let detailedErrorMessage = renderError;
      const workerPathUsed = typeof window !== 'undefined' ? pdfjsLib.GlobalWorkerOptions.workerSrc : 'N/A (server)';

      if (currentImportedApiVersion && (renderError.includes("Failed to fetch") || renderError.includes("NetworkError")) && renderError.includes("pdf.worker.min.mjs")) {
          detailedErrorMessage = `Failed to load PDF.js worker from: ${workerPathUsed}. This URL was constructed using the imported PDF.js API version '${currentImportedApiVersion}'. This API version may be non-standard, or a worker for it may not exist at this CDN path. This often indicates an issue with the main PDF.js library version provided by the environment. (Expected version from package.json: ${EXPECTED_PDF_JS_VERSION_FROM_PACKAGE_JSON}).`;
      } else if (renderError.includes("The API version") && renderError.includes("does not match the Worker version")) {
          // This error message should ideally not appear now. If it does, it means the dynamic worker path was overridden or failed.
          detailedErrorMessage = `PDF.js API/Worker version mismatch! Imported API: ${currentImportedApiVersion || 'unknown'}, Worker Path: ${workerPathUsed}. This indicates an internal inconsistency. (Expected from package.json: ${EXPECTED_PDF_JS_VERSION_FROM_PACKAGE_JSON}).`;
      }

      errorDisplay = (
         <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 border border-destructive/50 text-destructive-foreground rounded-md p-1 text-xs text-center pointer-events-none"
            title={detailedErrorMessage}
          >
            <FileWarning className="h-4 w-4 mb-0.5 flex-shrink-0" />
            <p className="leading-tight text-[10px]">
                { (renderError.includes("Failed to fetch") || renderError.includes("NetworkError")) && renderError.includes("pdf.worker")
                    ? `Worker Load Fail (API: ${currentImportedApiVersion || 'N/A'})`
                    : (renderError.includes("version") && renderError.includes("match")) 
                        ? `Version Mismatch (API: ${currentImportedApiVersion || 'N/A'})`
                        : 'PDF Render Error'
                }
            </p>
            <p className="leading-tight text-[9px] opacity-80 mt-0.5 px-1">
                Expected: ${EXPECTED_PDF_JS_VERSION_FROM_PACKAGE_JSON}
            </p>
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

