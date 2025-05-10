
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
  
  const instanceId = useRef(Math.random().toString(36).substring(7)).current;
  const logPrefix = `PdfPagePreview[${instanceId}](page:${pageIndex}, rot:${rotation}):`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const PDF_JS_VERSION = "4.4.168"; 
      const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
      if (pdfjsLib.GlobalWorkerOptions.workerSrc !== cdnPath) {
        console.log(`${logPrefix} Initializing: Setting pdfjsLib.GlobalWorkerOptions.workerSrc to CDN path for version ${PDF_JS_VERSION}`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
      } else {
        console.log(`${logPrefix} Initializing: pdfjsLib.GlobalWorkerOptions.workerSrc already set correctly to ${cdnPath}`);
      }
    }
  }, [logPrefix]);


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
      setError("Canvas element not found (renderPage)."); 
      setLoading(false); 
      setDimensions(null);
      return;
    }

    console.log(`${logPrefix} Starting render process. Setting loading=true, error=null.`);
    setLoading(true);
    setError(null);

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
      const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); 
      console.log(`${logPrefix} Page ${pageIndex + 1} loaded. Original page rotation: ${page.rotate}, Original width: ${page.view[2]}, height: ${page.view[3]}.`);

      const normalizedDynamicRotation = (rotation || 0) % 360;
      const totalRotation = (page.rotate + normalizedDynamicRotation + 360) % 360; 
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

      canvas.height = newCanvasHeight; 
      canvas.width = newCanvasWidth;   
      console.log(`${logPrefix} Canvas actual attributes set: width=${canvas.width}, height=${canvas.height}.`);
      
      setDimensions({ width: newCanvasWidth, height: newCanvasHeight });
      console.log(`${logPrefix} Dimensions state updated for styling: width=${newCanvasWidth}, height=${newCanvasHeight}.`);

      const RENDER_TIMEOUT = 10000; // 10 seconds
      const renderPromise = page.render(renderContext).promise;
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Render timed out after ${RENDER_TIMEOUT/1000}s for page ${pageIndex+1}`)), RENDER_TIMEOUT)
      );

      const renderContext: RenderParameters = {
        canvasContext: context,
        viewport: viewport,
      };
      console.log(`${logPrefix} Starting page.render() with context and viewport (timeout: ${RENDER_TIMEOUT/1000}s)...`);
      
      await Promise.race([renderPromise, timeoutPromise]);
      
      console.log(`${logPrefix} page.render() COMPLETED SUCCESSFULLY for page ${pageIndex + 1}.`);
      
      // Optional: Aggressive cleanup if experiencing memory issues, but generally not needed per-preview
      // if (page && typeof page.cleanup === 'function') {
      //   page.cleanup();
      //   console.log(`${logPrefix} Page ${pageIndex + 1} cleanup called.`);
      // }
      // if (pdf && typeof pdf.destroy === 'function') {
      //    // Be cautious with destroy() if the PDFDocumentProxy might be reused.
      //    // await pdf.destroy(); 
      //    // console.log(`${logPrefix} PDF document destroy called.`);
      // }


    } catch (err: any) {
      console.error(`${logPrefix} Error during renderPage process for page ${pageIndex + 1}:`, err.message, err.stack, err);
      setError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
      setDimensions(null); 
    } finally {
      setLoading(false);
      console.log(`${logPrefix} renderPage finished for page ${pageIndex + 1}. Loading state set to false.`);
    }
  }, [pdfDataUri, pageIndex, rotation, targetHeight, logPrefix]); 

  useEffect(() => {
    // This effect triggers the rendering process when essential props change or canvas becomes available.
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        // Fallback: Ensure worker is set if the mount effect somehow didn't run or was cleared.
        const PDF_JS_VERSION = "4.4.168";
        const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
        console.warn(`${logPrefix} WorkerSrc not set in render useEffect. Setting to: ${cdnPath}`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
    }

    if (pdfDataUri && canvasRef.current) {
      console.log(`${logPrefix} useEffect[render trigger for page ${pageIndex+1}]: Conditions met, calling renderPage.`);
      renderPage();
    } else {
      console.log(`${logPrefix} useEffect[render trigger for page ${pageIndex+1}]: Conditions NOT met. pdfDataUri: ${!!pdfDataUri}, canvasRef.current: ${!!canvasRef.current}`);
      if (!pdfDataUri) {
        setLoading(false); 
        setError("No PDF data provided for preview.");
        setDimensions(null);
      } else { 
        // pdfDataUri exists, but canvasRef.current is null. We are waiting for canvas.
        if (!loading) setLoading(true); // Set loading true as we expect canvas to appear
        setError(null); 
      }
    }
  // renderPage is memoized by useCallback.
  // logPrefix is stable.
  // pageIndex, rotation, targetHeight are primitive props.
  }, [pdfDataUri, pageIndex, rotation, targetHeight, renderPage, logPrefix, loading]);


  const currentDisplayHeight = dimensions?.height || targetHeight;
  const currentDisplayWidth = dimensions?.width || Math.max(50, targetHeight * (210 / 297));


  if (loading) {
    // console.log(`${logPrefix} Rendering: Skeleton for page ${pageIndex+1}. Height: ${targetHeight}, Width: ${currentDisplayWidth}`);
    return (
      <Skeleton
        className={cn("rounded-md bg-muted/50", className)}
        style={{ height: `${targetHeight}px`, width: `${currentDisplayWidth}px` }}
        aria-label={`Loading preview for page ${pageIndex + 1}`}
      />
    );
  }

  if (error) {
    // console.log(`${logPrefix} Rendering: Error UI for page ${pageIndex+1}. Message: ${error}. Height: ${targetHeight}, Width: ${currentDisplayWidth}`);
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-destructive/10 border border-destructive text-destructive-foreground rounded-md p-2 text-xs text-center overflow-hidden",
          className
        )}
        style={{ height: `${targetHeight}px`, width: `${currentDisplayWidth}px` }}
        title={error} 
      >
        <FileWarning className="h-5 w-5 mb-1 flex-shrink-0" />
        <p className="leading-tight">Page {pageIndex + 1}: Error</p>
      </div>
    );
  }
  
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    // console.log(`${logPrefix} Rendering: Invalid Size UI for page ${pageIndex+1}. Dimensions:`, dimensions, `Height: ${targetHeight}, Width: ${currentDisplayWidth}`);
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

  // console.log(`${logPrefix} Rendering: Canvas for page ${pageIndex+1}. Dimensions:`, dimensions);
  return (
    <canvas
      ref={canvasRef}
      className={cn("border border-muted shadow-sm rounded-md bg-white", className)}
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

