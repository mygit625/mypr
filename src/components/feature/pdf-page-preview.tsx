
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// Initialize workerSrc once on the client side when the module loads.
if (typeof window !== 'undefined') {
  const PDF_JS_VERSION = "4.4.168"; // Ensure this matches the installed version
  const cdnPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== cdnPath) {
    console.log(`PdfPagePreview: Setting pdfjsLib.GlobalWorkerOptions.workerSrc to ${cdnPath}`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = cdnPath;
  }
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const instanceId = useRef(`pdf-preview-${pageIndex}-${Math.random().toString(36).substring(2, 7)}`).current;
  const logPrefix = `PdfPagePreview[${instanceId}](page:${pageIndex + 1}, rot:${rotation}):`;

  const renderPage = useCallback(async () => {
    console.log(`${logPrefix} renderPage CALLED.`);
    const canvas = canvasRef.current;

    if (!pdfDataUri) {
      console.warn(`${logPrefix} No pdfDataUri. Aborting renderPage.`);
      setError("No PDF data available to render.");
      setLoading(false);
      setDimensions(null);
      if (canvas) canvas.setAttribute('data-render-status', 'no-pdf-data');
      return;
    }

    if (!canvas) {
      console.warn(`${logPrefix} Canvas element not available. Aborting renderPage.`);
      setError("Canvas element not ready for rendering.");
      setLoading(false);
      return;
    }

    console.log(`${logPrefix} Starting render. Current rotation: ${rotation}`);
    setLoading(true);
    setError(null);
    // setDimensions(null); // Clears previous dimensions, might cause flicker if loading is fast

    try {
      canvas.setAttribute('data-render-status', 'loading');
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
         throw new Error("PDF.js workerSrc not configured. This should have been set at module load.");
      }
      
      console.log(`${logPrefix} Calling pdfjsLib.getDocument()`);
      const loadingTask = pdfjsLib.getDocument({ data: pdfDataArray });
      const pdf: PDFDocumentProxy = await loadingTask.promise;
      console.log(`${logPrefix} PDF loaded. Total pages: ${pdf.numPages}`);

      if (pageIndex < 0 || pageIndex >= pdf.numPages) {
        throw new Error(`Page index ${pageIndex + 1} is out of bounds (Total pages: ${pdf.numPages}).`);
      }

      const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); 
      console.log(`${logPrefix} Page ${pageIndex + 1} obtained. Original rotation: ${page.rotate}`);
      
      const normalizedDynamicRotation = (rotation || 0) % 360;
      const totalRotation = (page.rotate + normalizedDynamicRotation + 360) % 360; 
      console.log(`${logPrefix} Total rotation for viewport: ${totalRotation}`);
      
      const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotation });
      if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
        throw new Error("Page viewport at scale 1 has invalid dimensions (height or width is zero or negative).");
      }

      const scale = targetHeight / viewportAtScale1.height;
      if (!Number.isFinite(scale) || scale <= 0) {
        throw new Error(`Invalid scale calculated for rendering: ${scale.toFixed(4)}. Target height: ${targetHeight}, Viewport height: ${viewportAtScale1.height}`);
      }
      console.log(`${logPrefix} Calculated scale: ${scale}`);

      const viewport = page.getViewport({ scale, rotation: totalRotation });
      if (viewport.width <= 0 || viewport.height <= 0) {
        throw new Error("Calculated viewport for rendering has invalid dimensions.");
      }
      console.log(`${logPrefix} Viewport calculated: W=${viewport.width}, H=${viewport.height}`);

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas 2D context.');

      const newCanvasWidth = Math.round(viewport.width);
      const newCanvasHeight = Math.round(viewport.height);

      canvas.height = newCanvasHeight; 
      canvas.width = newCanvasWidth;   
      
      setDimensions({ width: newCanvasWidth, height: newCanvasHeight });
      console.log(`${logPrefix} Canvas attributes set: W=${canvas.width}, H=${canvas.height}. Dimensions state updated.`);

      // Debug fill
      context.fillStyle = 'rgba(255, 192, 203, 0.5)'; // Light pink for debugging
      context.fillRect(0, 0, canvas.width, canvas.height);
      canvas.setAttribute('data-render-status', 'debug-filled');
      console.log(`${logPrefix} Canvas filled with debug color.`);

      const RENDER_TIMEOUT = 10000; // 10 seconds
      const renderContext: RenderParameters = { canvasContext: context, viewport: viewport };
      const renderTask = page.render(renderContext);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Render timed out for page ${pageIndex + 1} after ${RENDER_TIMEOUT/1000}s`)), RENDER_TIMEOUT)
      );
      
      console.log(`${logPrefix} Starting page.render() for page ${pageIndex + 1}`);
      await Promise.race([renderTask.promise, timeoutPromise]);
      console.log(`${logPrefix} page.render() COMPLETED SUCCESSFULLY for page ${pageIndex + 1}.`);
      canvas.setAttribute('data-render-status', 'rendered');
      
    } catch (err: any) {
      console.error(`${logPrefix} Error during renderPage:`, err.message, err.stack ? err.stack : '');
      setError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
      setDimensions(null);
      if (canvas) canvas.setAttribute('data-render-status', 'error');
    } finally {
      setLoading(false);
      console.log(`${logPrefix} renderPage finished. Loading state: false.`);
    }
  }, [pdfDataUri, pageIndex, rotation, targetHeight, logPrefix]); 

  useEffect(() => {
    // This effect triggers rendering when key props change or component mounts with data.
    if (!pdfDataUri) {
      console.log(`${logPrefix} useEffect: No pdfDataUri. Clearing state.`);
      setLoading(false);
      setError("No PDF data provided.");
      setDimensions(null);
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.setAttribute('data-render-status', 'cleared-no-data');
      }
      return;
    }

    if (!canvasRef.current) {
      console.log(`${logPrefix} useEffect: Canvas not yet available. Setting loading true.`);
      // Canvas ref not yet set, component will re-render, then this effect will run again.
      setLoading(true); 
      setError(null);
      setDimensions(null);
      return;
    }
    
    console.log(`${logPrefix} useEffect: pdfDataUri and canvas are present. Calling renderPage.`);
    renderPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDataUri, pageIndex, rotation, targetHeight]); // Removed renderPage from deps as it causes re-runs; its own deps handle changes.

  const currentDisplayHeight = targetHeight;
  const currentDisplayWidth = dimensions ? dimensions.width : Math.max(50, targetHeight * (210 / 297)); // A4 aspect ratio for skeleton/error if no dimensions

  if (loading) {
    return (
      <Skeleton
        className={cn("rounded-md bg-muted/50", className)}
        style={{ height: `${currentDisplayHeight}px`, width: `${currentDisplayWidth}px` }}
        aria-label={`Loading preview for page ${pageIndex + 1}`}
      />
    );
  }

  if (error) {
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
        <p className="leading-tight">Page {pageIndex + 1}: Error</p>
        <p className="leading-tight truncate hidden sm:block">{error.length > 50 ? error.substring(0, 50) + '...' : error}</p>
      </div>
    );
  }
  
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
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
      data-render-status="idle" // Initial status before renderPage touches it
    />
  );
};

export default PdfPagePreview;

