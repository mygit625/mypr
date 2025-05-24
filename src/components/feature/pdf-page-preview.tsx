
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// CRITICAL DIAGNOSTIC LOGS: Please check your browser console for these messages and report them.
console.log('[PdfPagePreview] Imported pdfjsLib object:', pdfjsLib);
console.log('[PdfPagePreview] Imported pdfjsLib.version:', pdfjsLib.version);


const PDF_JS_VERSION = "4.4.168"; // This MUST match your installed pdfjs-dist version from package.json

if (typeof window !== 'undefined') {
  try {
    const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
    // Only set workerSrc if it's not already set or differs, to avoid potential issues with HMR or multiple initializations.
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== cdnPath) {
        console.log(`[PdfPagePreview] Attempting to set pdfjsLib.GlobalWorkerOptions.workerSrc to: ${cdnPath} (using PDF_JS_VERSION: ${PDF_JS_VERSION})`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
    } else {
        console.log(`[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc was already correctly set to: ${cdnPath}`);
    }
    console.log(`[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc is now: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
  } catch (e) {
    console.error("[PdfPagePreview] Error during initial workerSrc setup:", e);
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
  // This log confirms the version of pdfjsLib being used at the point of rendering.
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
    if (typeof window !== 'undefined') {
        const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
        console.warn(`${logPrefix} Re-attempting to set workerSrc as it was not found during render.`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
    }
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
    
    context.clearRect(0, 0, canvas.width, canvas.height); // Clear previous content
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
      // Ensure loadingTask is destroyed if pdf.getDocument().promise rejects or never resolves
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
  // Use useRef for a truly stable prefix that doesn't change on re-renders
  const stableInstanceLogPrefix = useRef(`pdf-pv-${pageIndex}-${Math.random().toString(36).substring(2, 7)}`).current;


  useEffect(() => {
    let isActive = true;
    const canvasElement = canvasRef.current;
    // Use the stable prefix from the ref
    const logPrefix = `${stableInstanceLogPrefix}-eff`;

    if (!pdfDataUri) {
      if (isActive) {
        setRenderError("No PDF data provided.");
        setIsLoading(false);
      }
      return;
    }
    
    // Set loading to true at the start of an attempt if not already
    if(isActive && !isLoading) setIsLoading(true);
    // Clear previous error if we are attempting a new render with a valid URI
    if(isActive && renderError && pdfDataUri) setRenderError(null);


    if (!canvasElement) {
       console.log(`${logPrefix} Canvas ref not current for page ${pageIndex +1}. Current isLoading: ${isLoading}. Will show loading or wait for ref.`);
      // If canvas isn't ready, ensure we are in loading state. Effect will re-run when ref becomes available.
      if (isActive && !isLoading) setIsLoading(true); 
      return;
    }
    
    console.log(`${logPrefix} Attempting render for page ${pageIndex + 1}. URI starts: ${pdfDataUri.substring(0,30)}..., Canvas available: ${!!canvasElement}`);

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
          // setRenderError(null); // Already cleared before the call
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
      console.log(`${logPrefix} Cleanup for page ${pageIndex + 1}.`);
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, stableInstanceLogPrefix]); // stableInstanceLogPrefix is from useRef, so it's stable

  const estimatedWidth = targetHeight * (210 / 297); // A4 aspect ratio for placeholder

  let specificErrorDisplay = null;
  if (renderError && renderError.includes("API version") && renderError.includes("does not match the Worker version")) {
    specificErrorDisplay = (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/20 border border-destructive text-destructive-foreground rounded-md p-2 text-xs text-center pointer-events-none">
        <FileWarning className="h-5 w-5 mb-1 flex-shrink-0" />
        <p className="font-semibold">PDF Library Mismatch!</p>
        <p className="mt-1 text-[10px]">App's PDF library version is incompatible with its worker.</p>
        <p className="mt-1 text-[9px] opacity-80">This is an environment setup issue.</p>
      </div>
    );
  } else if (renderError) {
    specificErrorDisplay = (
       <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 border border-destructive/50 text-destructive-foreground rounded-md p-1 text-xs text-center pointer-events-none"
          title={renderError}
        >
          <FileWarning className="h-4 w-4 mb-0.5 flex-shrink-0" />
          <p className="leading-tight text-[10px]">Page {pageIndex + 1}: Error</p>
        </div>
    );
  }

  return (
    <div 
      className={cn("relative bg-transparent overflow-hidden flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-md", className)}
      style={{ 
        height: `${targetHeight}px`, 
        width: `auto`, 
        minWidth: `${Math.max(50, Math.round(estimatedWidth * 0.8))}px`, 
        maxWidth: `${Math.max(100, Math.round(estimatedWidth * 1.2))}px` 
      }}
    >
      {/* Canvas is always rendered to ensure ref is attached, visibility controlled by opacity and overlays */}
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
      
      {/* Overlay for loading state */}
      {isLoading && pdfDataUri && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-background/30 backdrop-blur-sm">
            <Skeleton
                className="rounded-md bg-muted/50"
                style={{ 
                  height: `calc(100% - 4px)`, // Adjust for border
                  width: `calc(100% - 4px)`   // Adjust for border
                }}
                aria-label={`Loading preview for page ${pageIndex + 1}`}
            />
        </div>
      )}

      {/* Overlay for error state */}
      {specificErrorDisplay}


       {/* Placeholder if no PDF data URI is provided (e.g., before file upload) */}
       {(!pdfDataUri && !isLoading) && ( 
         <Skeleton
            className={cn("rounded-md bg-muted/30 w-full h-full")}
            aria-label={`No PDF loaded for page ${pageIndex + 1} preview`}
        />
       )}
    </div>
  );
};

export default PdfPagePreview;

