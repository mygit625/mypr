
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

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const importedApiVersion = pdfjsLib.version;

if (typeof window !== 'undefined' && importedApiVersion) {
    const dynamicWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${importedApiVersion}/pdf.worker.min.mjs`;
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== dynamicWorkerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = dynamicWorkerSrc;
    }
} else if (typeof window !== 'undefined') {
    const fallbackVersion = "4.4.168"; 
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
        if (isActive) {
          setRenderError("No PDF data provided.");
          setIsLoading(false);
        }
        return;
      }

      if (!canvasElement) {
        if (isActive) {
            if(!isLoading) setIsLoading(true); 
            setRenderError(null); 
        }
        return; 
      }
      
      if (isActive) {
         setIsLoading(true);
         setRenderError(null);
         setActualUsedApiVersion(pdfjsLib.version); 
         setCurrentWorkerSrc(pdfjsLib.GlobalWorkerOptions.workerSrc as string);
      }

      let pdf: PDFDocumentProxy | null = null;
      let pageProxy: PDFPageProxy | null = null; // Renamed to avoid conflict with 'page' in other scopes

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

        const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
        pdf = await loadingTask.promise;

        if (pageIndex < 0 || pageIndex >= pdf.numPages) {
          throw new Error(`${logPrefix}-render Page index ${pageIndex + 1} out of bounds (Total: ${pdf.numPages}).`);
        }

        pageProxy = await pdf.getPage(pageIndex + 1); // Assign to pageProxy
        const dynamicRotation = (rotation || 0); 
        const totalRotationForViewport = (pageProxy.rotate + dynamicRotation + 360) % 360;
        const viewportAtScale1 = pageProxy.getViewport({ scale: 1, rotation: totalRotationForViewport });

        if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
          throw new Error(`${logPrefix}-render Page viewport@1 has invalid dimensions (H:${viewportAtScale1.height} W:${viewportAtScale1.width}).`);
        }
        const scale = targetHeight / viewportAtScale1.height;
        if (!Number.isFinite(scale) || scale <= 0) {
          throw new Error(`${logPrefix}-render Invalid scale: ${scale.toFixed(4)}.`);
        }
        const viewport = pageProxy.getViewport({ scale, rotation: totalRotationForViewport });
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
        
        const renderTask = pageProxy.render(renderContextParams);
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
        if (pageProxy && typeof pageProxy.cleanup === 'function') {
          try {
            pageProxy.cleanup();
          } catch (cleanupError) {
             console.warn(`${logPrefix}-warn Error during pageProxy.cleanup():`, cleanupError);
          }
        }
        if (pdf && typeof (pdf as any).destroy === 'function') {
          try { await (pdf as any).destroy(); } catch (destroyError) { console.warn(`${logPrefix}-warn Error during pdf.destroy():`, destroyError); }
        }
      }
    };
    
    if (canvasElement || !pdfDataUri) {
        initRender();
    } else {
        setIsLoading(true);
        setRenderError(null);
    }

    return () => {
      isActive = false;
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, stableInstanceLogPrefix]); // isLoading removed as a dependency


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
        width: `auto`, 
        minWidth: `${Math.max(50, Math.round(estimatedWidth * 0.5))}px`, 
        maxWidth: `${Math.max(100, Math.round(estimatedWidth * 2))}px` 
      }}
    >
      <canvas
        key={`${pdfDataUri}-${pageIndex}-${rotation}`}
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
