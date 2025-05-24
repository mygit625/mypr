
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLibOriginal from 'pdfjs-dist/build/pdf.mjs'; // Import as original
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

const PDF_JS_VERSION = "4.4.168"; // This MUST match your installed pdfjs-dist version from package.json

// Make a mutable copy for potential modification
const pdfjsLib = { ...pdfjsLibOriginal };

// CRITICAL DIAGNOSTIC LOGS:
console.log('[PdfPagePreview] Imported pdfjsLibOriginal object:', pdfjsLibOriginal);
console.log('[PdfPagePreview] Initial pdfjsLib.version (from copy):', pdfjsLib.version);

// --- ATTEMPT HACK FOR VERSION MISMATCH ---
if (typeof window !== 'undefined') {
  if (pdfjsLib.version !== PDF_JS_VERSION) {
    console.warn(`[PdfPagePreview] HACK: Detected version mismatch. Attempting to override pdfjsLib.version. Original: ${pdfjsLib.version}, Target: ${PDF_JS_VERSION}`);
    try {
      Object.defineProperty(pdfjsLib, 'version', {
        value: PDF_JS_VERSION,
        writable: true, // Try to make it writable
        configurable: true, // Try to make it configurable
      });
      console.log(`[PdfPagePreview] HACK: After attempting override, pdfjsLib.version is now: ${pdfjsLib.version}`);
      if (pdfjsLib.version !== PDF_JS_VERSION) {
        console.error(`[PdfPagePreview] HACK: Override FAILED. Version is still ${pdfjsLib.version}. The version property might not be configurable.`);
      } else {
        console.log(`[PdfPagePreview] HACK: Override SUCCEEDED. pdfjsLib.version is now ${pdfjsLib.version}.`);
      }
    } catch (e) {
      console.error(`[PdfPagePreview] HACK: Error during pdfjsLib.version override attempt:`, e);
    }
  } else {
    console.log(`[PdfPagePreview] Versions match, no hack needed. pdfjsLib.version: ${pdfjsLib.version}`);
  }
  // --- END HACK ---

  // Setup workerSrc
  try {
    const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== cdnPath) {
        console.log(`[PdfPagePreview] Attempting to set pdfjsLib.GlobalWorkerOptions.workerSrc to: ${cdnPath} (using PDF_JS_VERSION: ${PDF_JS_VERSION})`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
    } else {
        console.log(`[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc was already correctly set to: ${cdnPath}`);
    }
    console.log(`[PdfPagePreview] pdfjsLib.GlobalWorkerOptions.workerSrc is now: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
  } catch (e) {
    console.error("[PdfPagePreview] Error during workerSrc setup:", e);
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
    const dynamicRotation = (rotation || 0); // Default to 0 if undefined
    // pdf.js rotates relative to the page's inherent rotation.
    // The viewport rotation is cumulative.
    const totalRotationForViewport = (page.rotate + dynamicRotation + 360) % 360;
    
    const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotationForViewport });
    if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
      // This could happen for zero-byte pages or corrupt PDFs.
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

    // Ensure canvas dimensions are positive integers
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
    console.log(`${logPrefix} Render task completed for page ${pageIndex + 1}.`);
    // Page cleanup is important to free up resources.
    try { page.cleanup(); } catch (cleanupError) { console.warn(`${logPrefix} Error during page cleanup for page ${pageIndex + 1}:`, cleanupError); }
    return { width: newCanvasWidth, height: newCanvasHeight };

  } finally {
    // Ensure PDF document is destroyed to free memory,
    // but only if it was successfully loaded.
    if (pdf && typeof (pdf as any).destroy === 'function') {
      try { await (pdf as any).destroy(); } catch (destroyError) { console.warn(`${logPrefix} Error destroying PDF doc:`, destroyError); }
    } else if (loadingTask && typeof (loadingTask as any).destroy === 'function' && !pdf) {
      // If pdf loading failed, but loadingTask exists, destroy it.
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
  const [importedPdfJsVersion, setImportedPdfJsVersion] = useState<string | null>(null);
  // Stable prefix for logging within this component instance
  const stableInstanceLogPrefix = useRef(`pdf-pv-${pageIndex}-${Math.random().toString(36).substring(2, 7)}`).current;

  useEffect(() => {
    // Capture the version of the pdfjsLib that was effectively imported/hacked for display
    setImportedPdfJsVersion(pdfjsLib.version);
  }, []);


  useEffect(() => {
    let isActive = true;
    const canvasElement = canvasRef.current;
    const logPrefix = `${stableInstanceLogPrefix}-eff`;

    async function initRender() {
      if (!pdfDataUri) {
        if (isActive) {
          setRenderError("No PDF data provided.");
          setIsLoading(false);
        }
        return;
      }

      if (!canvasElement) {
        console.log(`${logPrefix} Canvas ref not current yet for page ${pageIndex + 1}. Waiting for ref.`);
        // No need to setIsLoading(true) here, as it should be true from initial state or previous run
        return; // Ref will be available on a subsequent render
      }
      
      console.log(`${logPrefix} Attempting render for page ${pageIndex + 1}. URI starts: ${pdfDataUri.substring(0,30)}..., Canvas available: ${!!canvasElement}`);
      if (isActive && !isLoading) setIsLoading(true); // Set loading true before async operation
      if (isActive && renderError) setRenderError(null); // Clear previous error

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
          setRenderError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    initRender();

    return () => {
      isActive = false;
      console.log(`${logPrefix} Cleanup for page ${pageIndex + 1}.`);
    };
  }, [pdfDataUri, pageIndex, rotation, targetHeight, stableInstanceLogPrefix]); // isLoading and renderError removed as they are managed internally

  const estimatedWidth = targetHeight * (210 / 297); // A4 aspect ratio for placeholder

  let specificErrorDisplay = null;
  if (renderError) {
    // Check for the specific version mismatch error text
    if (renderError.includes("The API version") && renderError.includes("does not match the Worker version")) {
      specificErrorDisplay = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/20 border border-destructive text-destructive-foreground rounded-md p-2 text-xs text-center pointer-events-none">
          <FileWarning className="h-5 w-5 mb-1 flex-shrink-0" />
          <p className="font-semibold">PDF Library Version Mismatch!</p>
          <p className="mt-1 text-[10px]">Imported API reports: v{importedPdfJsVersion || 'unknown (loading...)'}</p>
          <p className="text-[10px]">Worker (expected): v{PDF_JS_VERSION}</p>
          <p className="mt-1 text-[9px] opacity-80">This is an environment setup issue. The core PDF library version is incorrect.</p>
        </div>
      );
    } else {
      specificErrorDisplay = (
         <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 border border-destructive/50 text-destructive-foreground rounded-md p-1 text-xs text-center pointer-events-none"
            title={renderError} // Show full error on hover
          >
            <FileWarning className="h-4 w-4 mb-0.5 flex-shrink-0" />
            <p className="leading-tight text-[10px]">Page {pageIndex + 1}: Render Error</p>
          </div>
      );
    }
  }
  

  return (
    <div 
      className={cn("relative bg-transparent overflow-hidden flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-md", className)}
      style={{ 
        height: `${targetHeight}px`, 
        width: `auto`, // Auto width based on canvas content
        minWidth: `${Math.max(50, Math.round(estimatedWidth * 0.5))}px`, // Prevent overly squished placeholder
        maxWidth: `${Math.max(100, Math.round(estimatedWidth * 2))}px` // Prevent overly wide placeholder
      }}
    >
      {/* Canvas is always rendered so ref can attach. Visibility controlled by opacity and overlays. */}
      <canvas
        ref={canvasRef}
        className={cn("border border-muted shadow-sm rounded-md bg-white transition-opacity duration-300", {
          // Hide canvas if loading, error, or no data, otherwise show it
          'opacity-0': isLoading || !!renderError || !pdfDataUri, 
          'opacity-100': !isLoading && !renderError && pdfDataUri,
        })}
        style={{
          display: 'block', 
          maxWidth: '100%', 
          maxHeight: '100%',
          objectFit: 'contain', // Ensures canvas content scales within its bounds
        }}
        role="img"
        aria-label={`Preview of PDF page ${pageIndex + 1}`}
      />
      
      {/* Loading Skeleton: Shown when isLoading is true AND there's no error */}
      {isLoading && !renderError && pdfDataUri && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-background/30 backdrop-blur-sm">
            <Skeleton
                className="rounded-md bg-muted/50"
                style={{ 
                  // Make skeleton slightly smaller than container to show border
                  height: `calc(100% - 4px)`, 
                  width: `calc(100% - 4px)`   
                }}
                aria-label={`Loading preview for page ${pageIndex + 1}`}
            />
        </div>
      )}

      {/* Error Display: Shown if renderError is set */}
      {specificErrorDisplay}

       {/* Fallback for when no PDF data URI is provided (and not loading) */}
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
