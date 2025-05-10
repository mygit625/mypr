"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfPagePreviewProps {
  pdfDataUri: string | null; // Allow null
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
  
  const instanceId = useRef(`pdf-preview-${pageIndex}-${Math.random().toString(36).substring(2, 7)}`).current;
  const logPrefix = `PdfPagePreview[${instanceId}](page:${pageIndex + 1}, rot:${rotation}):`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const PDF_JS_VERSION = "4.4.168"; 
      const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
      if (pdfjsLib.GlobalWorkerOptions.workerSrc !== cdnPath) {
        // console.log(`${logPrefix} Initializing: Setting pdfjsLib.GlobalWorkerOptions.workerSrc`);
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
      }
    }
  }, [logPrefix]);


  const renderPage = useCallback(async () => {
    // console.log(`${logPrefix} renderPage CALLED.`);
    const canvas = canvasRef.current;

    if (!pdfDataUri) {
      // console.warn(`${logPrefix} No pdfDataUri. Aborting renderPage.`);
      // State for this is handled by the useEffect watching pdfDataUri prop
      return;
    }

    if (!canvas) {
      // console.warn(`${logPrefix} Canvas element not available. Aborting renderPage.`);
      // This might happen if called too early, but useEffect should wait for canvasRef.
      setError("Canvas element not ready."); 
      setLoading(false); 
      return;
    }

    // console.log(`${logPrefix} Starting render. Current rotation: ${rotation}`);
    setLoading(true);
    setError(null);
    // setDimensions(null); // Clear old dimensions before starting new render

    try {
      const base64Marker = ';base64,';
      const base64Index = pdfDataUri.indexOf(base64Marker);
      if (base64Index === -1) throw new Error("Invalid PDF data URI format.");
      
      const pdfBase64Data = pdfDataUri.substring(base64Index + base64Marker.length);
      const pdfBinaryData = atob(pdfBase64Data);
      const pdfDataArray = new Uint8Array(pdfBinaryData.length);
      for (let i = 0; i < pdfBinaryData.length; i++) {
        pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
      }

      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
         throw new Error("PDF worker not configured.");
      }
      
      const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
      const pdf: PDFDocumentProxy = await loadingTask.promise;

      if (pageIndex >= pdf.numPages || pageIndex < 0) {
        throw new Error(`Page index ${pageIndex + 1} out of bounds (Total: ${pdf.numPages}).`);
      }

      const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); 
      
      const normalizedDynamicRotation = (rotation || 0) % 360;
      const totalRotation = (page.rotate + normalizedDynamicRotation + 360) % 360; 
      
      const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotation });

      if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
        throw new Error("Page viewport at scale 1 has invalid dimension.");
      }

      const scale = targetHeight / viewportAtScale1.height;
      if (!Number.isFinite(scale) || scale <= 0) {
        throw new Error(`Invalid scale for rendering: ${scale.toFixed(4)}.`);
      }

      const viewport = page.getViewport({ scale, rotation: totalRotation });
      if (viewport.width <= 0 || viewport.height <= 0) {
        throw new Error("Calculated viewport has invalid dimensions.");
      }

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas 2D context.');

      const newCanvasWidth = Math.round(viewport.width);
      const newCanvasHeight = Math.round(viewport.height);

      canvas.height = newCanvasHeight; 
      canvas.width = newCanvasWidth;   
      
      setDimensions({ width: newCanvasWidth, height: newCanvasHeight });
      // console.log(`${logPrefix} Canvas attributes set: W=${canvas.width}, H=${canvas.height}. Dimensions state updated.`);

      const RENDER_TIMEOUT = 10000;
      const renderContext: RenderParameters = { canvasContext: context, viewport: viewport };
      const renderTask = page.render(renderContext);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Render timed out after ${RENDER_TIMEOUT/1000}s`)), RENDER_TIMEOUT)
      );
      
      // console.log(`${logPrefix} Starting page.render()`);
      await Promise.race([renderTask.promise, timeoutPromise]);
      // console.log(`${logPrefix} page.render() COMPLETED SUCCESSFULLY.`);
      
    } catch (err: any) {
      console.error(`${logPrefix} Error during renderPage:`, err.message, err);
      setError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
      setDimensions(null); // Clear dimensions on error
    } finally {
      setLoading(false);
      // console.log(`${logPrefix} renderPage finished. Loading state: false.`);
    }
  }, [pdfDataUri, pageIndex, rotation, targetHeight, logPrefix]); 

  // Effect to handle pdfDataUri prop changes (e.g., file deselection)
  useEffect(() => {
    if (!pdfDataUri) {
      // console.log(`${logPrefix} pdfDataUri is null. Clearing state.`);
      setLoading(false);
      setError("No PDF data provided.");
      setDimensions(null);
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    } else {
      // If pdfDataUri is provided (or changes to a new one), trigger a re-render
      // console.log(`${logPrefix} pdfDataUri is present/changed. Current canvas: ${!!canvasRef.current}`);
      if (canvasRef.current) { // Canvas is ready
          renderPage();
      } else { // Canvas not ready yet, set loading true, will render when canvasRef is set
          setLoading(true);
          setError(null);
          setDimensions(null);
      }
    }
  }, [pdfDataUri, pageIndex, rotation, targetHeight, renderPage]); // renderPage is dependency


  const currentDisplayHeight = targetHeight; // Skeleton/Error height is fixed by targetHeight
  const currentDisplayWidth = Math.max(50, targetHeight * (210 / 297)); // A4 aspect ratio for skeleton/error

  if (loading) {
    // console.log(`${logPrefix} Rendering Skeleton.`);
    return (
      <Skeleton
        className={cn("rounded-md bg-muted/50", className)}
        style={{ height: `${currentDisplayHeight}px`, width: `${currentDisplayWidth}px` }}
        aria-label={`Loading preview for page ${pageIndex + 1}`}
      />
    );
  }

  if (error) {
    // console.log(`${logPrefix} Rendering Error UI: ${error}`);
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-destructive/10 border border-destructive text-destructive-foreground rounded-md p-2 text-xs text-center overflow-hidden",
          className
        )}
        style={{ height: `${currentDisplayHeight}px`, width: `${currentDisplayWidth}px` }}
        title={error} 
      >
        <FileWarning className="h-5 w-5 mb-1 flex-shrink-0" />
        <p className="leading-tight truncate">Page {pageIndex + 1}: Error</p>
        {/* <p className="leading-tight truncate hidden sm:block">{error}</p> */}
      </div>
    );
  }
  
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    // This case means !loading, !error, but dimensions are invalid.
    // This might happen if pdfDataUri became null and cleared dimensions, but component hasn't fully re-rendered to "No PDF" error state.
    // Or an unhandled path in renderPage.
    // console.log(`${logPrefix} Rendering Fallback UI (invalid dimensions).`);
    return (
      <div
        className={cn(
            "flex flex-col items-center justify-center bg-muted/20 border border-border text-muted-foreground rounded-md p-2 text-xs text-center",
            className
        )}
        style={{ height: `${currentDisplayHeight}px`, width: `${currentDisplayWidth}px` }}
        aria-label={`Preview for page ${pageIndex + 1} is unavailable or has invalid dimensions`}
      >
        <FileWarning className="h-5 w-5 mb-1 flex-shrink-0" />
        <p className="leading-tight">Page {pageIndex + 1}: Preview N/A</p>
      </div>
    );
  }

  // console.log(`${logPrefix} Rendering Canvas. Dimensions: W=${dimensions.width}, H=${dimensions.height}`);
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