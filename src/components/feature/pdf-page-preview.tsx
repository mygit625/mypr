
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// CRITICAL DIAGNOSTIC LOGS:
console.log('[PdfPagePreview] Imported pdfjsLib object:', pdfjsLib);
const importedApiVersion = pdfjsLib.version;
console.log('[PdfPagePreview] Imported pdfjsLib.version:', importedApiVersion);

// Dynamically set workerSrc based on the imported API version.
// This aims to match the worker version to whatever the main API reports.
// If importedApiVersion is unusual (e.g., "4.10.38"), this will likely result in a 404 for the worker.
if (typeof window !== 'undefined' && importedApiVersion) {
    const dynamicWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${importedApiVersion}/pdf.worker.min.mjs`;
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== dynamicWorkerSrc) {
        console.log(`[PdfPagePreview] Attempting to set pdfjsLib.GlobalWorkerOptions.workerSrc to: ${dynamicWorkerSrc} (based on imported API version: ${importedApiVersion})`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = dynamicWorkerSrc;
        console.log(`[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc is now (dynamically set): ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
    } else {
        console.log(`[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc was already dynamically set to: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
    }
} else if (typeof window !== 'undefined') {
    // Fallback if importedApiVersion is somehow not available. This shouldn't happen given the above log.
    const fallbackVersion = "4.4.168"; // Fallback to package.json version
    const fallbackWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${fallbackVersion}/pdf.worker.min.mjs`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = fallbackWorkerSrc;
    console.warn(`[PdfPagePreview] importedApiVersion not available. WorkerSrc set to fallback based on version ${fallbackVersion}: ${fallbackWorkerSrc}`);
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
  const [currentWorkerSrc, setCurrentWorkerSrc] = useState<string | null>(null);
  const [actualUsedApiVersion, setActualUsedApiVersion] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const canvasElement = canvasRef.current;
    const logPrefix = `${stableInstanceLogPrefix}-eff`;

    const initRender = async () => {
      if (!isActive) return;

      if (!pdfDataUri) {
        console.log(`${logPrefix} No PDF data URI provided for page ${pageIndex + 1}.`);
        if (isActive) {
          setRenderError("No PDF data provided.");
          setIsLoading(false);
        }
        return;
      }

      if (!canvasElement) {
        console.log(`${logPrefix} Canvas ref not current for page ${pageIndex + 1}. Will show loading.`);
        if (isActive) {
            if(!isLoading) setIsLoading(true); // Ensure loading is true if canvas not ready
            setRenderError(null); // Clear previous errors
        }
        return; // Wait for canvas ref
      }
      
      console.log(`${logPrefix} Attempting render for page ${pageIndex + 1}. URI starts: ${pdfDataUri.substring(0,30)}...`);
      if (isActive) {
         setIsLoading(true);
         setRenderError(null);
         setActualUsedApiVersion(pdfjsLib.version); // Store the version actually used by getDocument
         setCurrentWorkerSrc(pdfjsLib.GlobalWorkerOptions.workerSrc as string);
      }

      let pdf: PDFDocumentProxy | null = null;

      try {
        const base64Marker = ';base64,';
        const base64Index = pdfDataUri.indexOf(base64Marker);
        if (base64Index === -1) throw new Error(`${logPrefix}-render Invalid PDF data URI format.`);
        const pdfBase64Data = pdfDataUri.substring(base64Index + base64Marker.length);
        const pdfBinaryData = atob(pdfBase64Data);
        const pdfDataArray = new Uint8Array(pdfBinaryData.length);
        for (let i = 0; i < pdfBinaryData.length; i++) {
          pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
        }

        console.log(`${logPrefix}-render CURRENT CHECK: pdfjsLib.version: ${pdfjsLib.version}, GlobalWorkerOptions.workerSrc value: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);

        const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
        pdf = await loadingTask.promise;
        console.log(`${logPrefix}-render PDF loaded. Total pages: ${pdf.numPages}. Target page: ${pageIndex + 1}.`);

        if (pageIndex < 0 || pageIndex >= pdf.numPages) {
          throw new Error(`${logPrefix}-render Page index ${pageIndex + 1} out of bounds (Total: ${pdf.numPages}).`);
        }

        const page: PDFPageProxy = await pdf.getPage(pageIndex + 1);
        const dynamicRotation = (rotation || 0); // Default to 0 if undefined
        // Original page rotation + dynamic rotation from props
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

        const context = canvasElement.getContext('2d');
        if (!context) throw new Error(`${logPrefix}-render Could not get canvas 2D context.`);
        
        const newCanvasWidth = Math.max(1, Math.round(viewport.width));
        const newCanvasHeight = Math.max(1, Math.round(viewport.height));
        
        canvasElement.height = newCanvasHeight; 
        canvasElement.width = newCanvasWidth;

        const RENDER_TIMEOUT = 15000; 
        const renderContextParams: RenderParameters = { canvasContext: context, viewport: viewport };
        
        const renderTask = page.render(renderContextParams);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${logPrefix}-render Render timed out for page ${pageIndex + 1} after ${RENDER_TIMEOUT/1000}s`)), RENDER_TIMEOUT)
        );
        
        await Promise.race([renderTask.promise, timeoutPromise]);
        
        console.log(`${logPrefix}-render Render task completed for page ${pageIndex + 1}.`);
        if (isActive) setIsLoading(false); 

        try { page.cleanup(); } catch (cleanupError) { console.warn(`${logPrefix}-render Error during page cleanup:`, cleanupError); }

      } catch (err: any) {
        console.error(`${logPrefix} Error in renderPdfPageToCanvas for page ${pageIndex + 1}:`, err.message);
        if (isActive) {
          setRenderError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
          setIsLoading(false); 
        }
      } finally {
        if (pdf && typeof (pdf as any).destroy === 'function') {
          try { await (pdf as any).destroy(); } catch (destroyError) { console.warn(`${logPrefix}-render Error destroying PDF doc:`, destroyError); }
        }
      }
    };
    
    const timerId = setTimeout(() => {
        if (isActive) initRender();
    }, 100); 

    return () => {
      isActive = false;
      clearTimeout(timerId);
      console.log(`${logPrefix} Cleanup effect for page ${pageIndex + 1}.`);
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, stableInstanceLogPrefix]);


  const estimatedWidth = targetHeight * (210 / 297); 

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
                            : 'PDF Render Error'
                }
            </p>
            {(renderError.includes("The API version") && renderError.includes("does not match")) &&
             <p className="leading-tight text-[9px] opacity-80 mt-0.5 px-1">Expected worker to match API.</p>
            }
            {((renderError.includes("Failed to fetch") || renderError.includes("NetworkError")) && (workerSrcPath.includes(".worker.min.mjs") || workerSrcPath.includes(".worker.js"))) &&
             <p className="leading-tight text-[9px] opacity-80 mt-0.5 px-1">Worker for API '{apiV}' might be missing on CDN.</p>
            }
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

    