"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfPagePreviewProps {
  pdfDataUri: string;
  pageIndex: number; // 0-indexed
  rotation?: number; // Additional dynamic rotation: 0, 90, 180, 270
  targetHeight: number; // Target height for the preview canvas
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // Unique ID for this instance for logging, created once
  const instanceId = useRef(Math.random().toString(36).substring(7)).current;
  const logPrefix = `PdfPagePreview[${instanceId}](page:${pageIndex}, rot:${rotation}):`;

  useEffect(() => {
    // Set workerSrc once on component mount on the client
    if (typeof window !== 'undefined') {
      const PDF_JS_VERSION = "4.4.168"; // Match this with your pdfjs-dist version from package.json
      const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
      if (pdfjsLib.GlobalWorkerOptions.workerSrc !== cdnPath) {
        console.log(`${logPrefix} Initializing: Setting pdfjsLib.GlobalWorkerOptions.workerSrc to CDN path for version ${PDF_JS_VERSION}`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
      }
    }
  }, [logPrefix]); // logPrefix is stable, so this runs once on mount.


  useEffect(() => {
    // Log props on change to see if re-renders are expected
    console.log(`${logPrefix} Props update. pdfDataUri: ${pdfDataUri ? 'present' : 'null'}, pageIndex: ${pageIndex}, rotation: ${rotation}, targetHeight: ${targetHeight}`);
  }, [pdfDataUri, pageIndex, rotation, targetHeight, logPrefix]);


  const renderPage = useCallback(async () => {
    console.log(`${logPrefix} renderPage CALLED. canvasRef.current: ${!!canvasRef.current}`);
    const canvas = canvasRef.current;

    if (!pdfDataUri) {
      console.warn(`${logPrefix} No pdfDataUri provided. Setting error and stopping render.`);
      setError("No PDF data to render.");
      setLoading(false);
      setDimensions(null);
      return;
    }

    if (!canvas) {
      console.warn(`${logPrefix} Canvas element not available yet. Aborting renderPage.`);
      // This might happen if called before canvas is in DOM. useEffect should handle re-triggering.
      setError("Canvas element not found (renderPage)."); // Set an error to be safe
      setLoading(false); // If canvas isn't there, we are not actively loading this page.
      setDimensions(null);
      return;
    }

    console.log(`${logPrefix} Starting render process. Setting loading=true, error=null.`);
    setLoading(true);
    setError(null);
    // Not clearing dimensions immediately to avoid layout shift if possible

    try {
      console.log(`${logPrefix} Decoding base64 PDF data URI.`);
      const base64Marker = ';base64,';
      const base64Index = pdfDataUri.indexOf(base64Marker);
      if (base64Index === -1) {
        console.error(`${logPrefix} Invalid PDF data URI format (missing '${base64Marker}').`);
        throw new Error("Invalid PDF data URI format.");
      }
      const pdfBase64Data = pdfDataUri.substring(base64Index + base64Marker.length);
      const pdfBinaryData = atob(pdfBase64Data);
      const pdfDataArray = new Uint8Array(pdfBinaryData.length);
      for (let i = 0; i < pdfBinaryData.length; i++) {
        pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
      }
      console.log(`${logPrefix} PDF data decoded. Byte length: ${pdfDataArray.length}.`);

      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
         console.error(`${logPrefix} pdf.js workerSrc is not set! This is critical.`);
         throw new Error("PDF worker not configured. workerSrc is missing.");
      }
      console.log(`${logPrefix} Using workerSrc: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
      
      console.log(`${logPrefix} Calling pdfjsLib.getDocument() with data.`);
      const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
      const pdf: PDFDocumentProxy = await loadingTask.promise;
      console.log(`${logPrefix} Document loaded. Total pages in PDF: ${pdf.numPages}.`);

      if (pageIndex >= pdf.numPages || pageIndex < 0) {
        console.error(`${logPrefix} Page index ${pageIndex} is out of bounds (Total pages: ${pdf.numPages}).`);
        throw new Error(`Page index ${pageIndex + 1} is out of bounds for PDF with ${pdf.numPages} pages.`);
      }

      console.log(`${logPrefix} Getting page number ${pageIndex + 1} (0-indexed: ${pageIndex}).`);
      const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); // pdf.js pages are 1-indexed
      console.log(`${logPrefix} Page ${pageIndex + 1} loaded. Original page rotation: ${page.rotate}, Original width: ${page.view[2]}, height: ${page.view[3]}.`);

      const normalizedDynamicRotation = (rotation || 0) % 360;
      const totalRotation = (page.rotate + normalizedDynamicRotation + 360) % 360; // Ensure positive and within 0-359
      console.log(`${logPrefix} Input dynamic rotation: ${rotation}, Normalized: ${normalizedDynamicRotation}. Total effective rotation for viewport: ${totalRotation}.`);
      
      const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotation });
      console.log(`${logPrefix} Viewport at scale 1 & totalRotation ${totalRotation}: Width=${viewportAtScale1.width.toFixed(2)}, Height=${viewportAtScale1.height.toFixed(2)}`);

      if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
        console.error(`${logPrefix} Page viewport at scale 1 has invalid dimensions (W:${viewportAtScale1.width}, H:${viewportAtScale1.height}).`);
        throw new Error("Page viewport at scale 1 has zero or negative dimension.");
      }

      const scale = targetHeight / viewportAtScale1.height;
      console.log(`${logPrefix} Calculated scale: ${scale.toFixed(4)} (targetHeight: ${targetHeight} / vpScale1.height: ${viewportAtScale1.height.toFixed(2)})`);

      if (!Number.isFinite(scale) || scale <= 0) {
        console.error(`${logPrefix} Invalid scale calculated: ${scale}.`);
        throw new Error(`Invalid scale for rendering: ${scale.toFixed(4)}.`);
      }

      const viewport = page.getViewport({ scale, rotation: totalRotation });
      console.log(`${logPrefix} Final viewport for rendering: Width=${viewport.width.toFixed(2)}, Height=${viewport.height.toFixed(2)}, Scale=${viewport.scale.toFixed(4)}, Rotation=${viewport.rotation}`);

      if (viewport.width <= 0 || viewport.height <= 0) {
        console.error(`${logPrefix} Final viewport dimensions are invalid (W:${viewport.width}, H:${viewport.height}).`);
        throw new Error("Calculated viewport for rendering has invalid dimensions.");
      }

      const context = canvas.getContext('2d');
      if (!context) {
        console.error(`${logPrefix} Could not get canvas 2D context.`);
        throw new Error('Could not get canvas 2D context.');
      }
      console.log(`${logPrefix} Canvas 2D context obtained successfully.`);

      const newCanvasWidth = Math.round(viewport.width);
      const newCanvasHeight = Math.round(viewport.height);

      canvas.height = newCanvasHeight; // Set canvas buffer size
      canvas.width = newCanvasWidth;   // Set canvas buffer size
      console.log(`${logPrefix} Canvas actual attributes set: width=${canvas.width}, height=${canvas.height}.`);
      
      // This state update is for styling the canvas element container / responsive sizing if needed.
      setDimensions({ width: newCanvasWidth, height: newCanvasHeight });
      console.log(`${logPrefix} Dimensions state updated for styling: width=${newCanvasWidth}, height=${newCanvasHeight}.`);

      const renderContext: RenderParameters = {
        canvasContext: context,
        viewport: viewport,
      };
      console.log(`${logPrefix} Starting page.render() with context and viewport...`);
      await page.render(renderContext).promise;
      console.log(`${logPrefix} page.render() COMPLETED SUCCESSFULLY.`);
      
      // Cleanup
      // page.cleanup(); // Recommended for freeing resources if the page object is not going to be used further.
      // pdf.destroy(); // Call this if the PDFDocumentProxy itself is not needed anymore. Be careful if it might be reused (e.g. for other pages).
      // For this component, if each preview is independent, destroying might be okay.
      // However, if the parent component might re-render with the same pdfDataUri for different pages,
      // destroying pdf too early might be an issue. Let's omit destroy() for now to be safe.

    } catch (err: any) {
      console.error(`${logPrefix} Error during renderPage process:`, err.message, err.stack, err);
      setError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
      setDimensions(null); // Clear dimensions on error to ensure error UI is sized correctly
    } finally {
      setLoading(false);
      console.log(`${logPrefix} renderPage finished. Loading state set to false.`);
    }
  }, [pdfDataUri, pageIndex, rotation, targetHeight, logPrefix]); // canvasRef is stable via useRef

  useEffect(() => {
    console.log(`${logPrefix} useEffect[renderPage] triggered. pdfDataUri: ${!!pdfDataUri}, canvasRef.current: ${!!canvasRef.current}`);
    if (pdfDataUri && canvasRef.current) {
      console.log(`${logPrefix} Conditions met, calling renderPage.`);
      renderPage();
    } else if (!pdfDataUri) {
      console.log(`${logPrefix} No PDF data URI, cancelling render. Setting loading=false, error, dimensions=null.`);
      setLoading(false);
      setError("No PDF data provided for preview.");
      setDimensions(null);
    } else if (!canvasRef.current) {
      console.log(`${logPrefix} Canvas ref not ready yet. Setting loading=true (or keeping it true), error=null.`);
      // This indicates we are likely in an initial render phase waiting for the canvas element.
      // No explicit setLoading(true) here if it's already true from initial state.
      // We want to avoid flashing if pdfDataUri is present.
      if(!loading) setLoading(true); // If for some reason loading was false, set it true as we wait for canvas
      setError(null); // Clear any previous error
    }
  }, [pdfDataUri, renderPage, logPrefix, loading]); // renderPage is memoized, logPrefix is stable. Added 'loading' to re-evaluate if canvas becomes available.

  // --- UI Rendering ---
  // Use targetHeight for skeleton/error initially, then actual dimensions if available
  const currentDisplayHeight = dimensions?.height || targetHeight;
  // Approx A4 ratio for width if not available, ensuring a minimum width
  const currentDisplayWidth = dimensions?.width || Math.max(50, targetHeight * (210 / 297));


  if (loading) {
    console.log(`${logPrefix} Rendering: Skeleton. Height: ${targetHeight}, Width: ${currentDisplayWidth}`);
    return (
      <Skeleton
        className={cn("rounded-md bg-muted/50", className)}
        style={{ height: `${targetHeight}px`, width: `${currentDisplayWidth}px` }}
        aria-label={`Loading preview for page ${pageIndex + 1}`}
      />
    );
  }

  if (error) {
    console.log(`${logPrefix} Rendering: Error UI. Message: ${error}. Height: ${targetHeight}, Width: ${currentDisplayWidth}`);
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-destructive/10 border border-destructive text-destructive-foreground rounded-md p-2 text-xs text-center overflow-hidden",
          className
        )}
        style={{ height: `${targetHeight}px`, width: `${currentDisplayWidth}px` }}
        title={error} // Full error on hover
      >
        <FileWarning className="h-5 w-5 mb-1 flex-shrink-0" />
        <p className="leading-tight">Page {pageIndex + 1}: Error</p>
        {/* Optionally, a short error message if it's user-friendly */}
        {/* <p className="leading-tight text-[10px] break-words">{error.substring(0,50)}...</p> */}
      </div>
    );
  }
  
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    // This case should ideally be covered by error handling if rendering failed to produce dimensions.
    // But as a fallback, show an "invalid size" message.
    console.log(`${logPrefix} Rendering: Invalid Size UI. Dimensions:`, dimensions, `Height: ${targetHeight}, Width: ${currentDisplayWidth}`);
    return (
      <div
        className={cn(
            "flex flex-col items-center justify-center bg-yellow-50 border border-yellow-400 text-yellow-700 rounded-md p-2 text-xs text-center",
            className
        )}
        style={{ height: `${targetHeight}px`, width: `${currentDisplayWidth}px` }}
        aria-label={`Preview for page ${pageIndex + 1} has invalid dimensions or not yet rendered`}
      >
        <FileWarning className="h-5 w-5 mb-1 text-yellow-600 flex-shrink-0" />
        <p className="leading-tight">Page {pageIndex + 1}: Invalid Preview Size</p>
      </div>
    );
  }

  // If loading is false, no error, and dimensions are valid, render the canvas
  console.log(`${logPrefix} Rendering: Canvas. Dimensions:`, dimensions);
  return (
    <canvas
      ref={canvasRef}
      className={cn("border border-muted shadow-sm rounded-md bg-white", className)}
      style={{ // These styles are for the canvas element's display box
        display: 'block', 
        width: `${dimensions.width}px`, 
        height: `${dimensions.height}px`,
      }}
      // Width and height attributes for the canvas drawing surface are set in renderPage
      role="img"
      aria-label={`Preview of PDF page ${pageIndex + 1}`}
    />
  );
};

export default PdfPagePreview;
