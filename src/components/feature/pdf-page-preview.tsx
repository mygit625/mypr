"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// Ensure workerSrc is set correctly for pdfjs-dist
if (typeof window !== 'undefined') {
  // Match this with your pdfjs-dist version from package.json (e.g., "4.4.168")
  const PDF_JS_VERSION = "4.4.168"; 
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
}

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

  const renderPage = useCallback(async () => {
    const PPREVIEW_LOG_PREFIX = `PdfPagePreview(page:${pageIndex}, rot:${rotation}):`;
    console.log(`${PPREVIEW_LOG_PREFIX} Render attempt. pdfDataUri: ${!!pdfDataUri}, canvasRef: ${!!canvasRef.current}`);
    
    const canvas = canvasRef.current;

    if (!pdfDataUri || !canvas) {
      console.warn(`${PPREVIEW_LOG_PREFIX} Bailing early - no pdfDataUri or canvasRef.`);
      if (!pdfDataUri) {
          setLoading(false); // Not loading if no data
          setError("No PDF data provided.");
      }
      return;
    }

    setLoading(true);
    setError(null);
    setDimensions(null); 
    console.log(`${PPREVIEW_LOG_PREFIX} State reset, loading started.`);

    try {
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        console.error(`${PPREVIEW_LOG_PREFIX} pdf.js workerSrc not set!`);
        throw new Error("PDF worker not configured.");
      }
      
      const base64Marker = ';base64,';
      const base64Index = pdfDataUri.indexOf(base64Marker);

      if (base64Index === -1) {
        console.error(`${PPREVIEW_LOG_PREFIX} Invalid PDF data URI format.`);
        throw new Error("Invalid PDF data URI format.");
      }
      const pdfData = atob(pdfDataUri.substring(base64Index + base64Marker.length));
      
      console.log(`${PPREVIEW_LOG_PREFIX} Getting document...`);
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf: PDFDocumentProxy = await loadingTask.promise;
      console.log(`${PPREVIEW_LOG_PREFIX} Document loaded. Total pages: ${pdf.numPages}`);
      
      if (pageIndex >= pdf.numPages) {
        console.error(`${PPREVIEW_LOG_PREFIX} Page index ${pageIndex} out of bounds (Total: ${pdf.numPages}).`);
        throw new Error(`Page index ${pageIndex + 1} is out of bounds.`);
      }
      const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); // pdf.js pages are 1-indexed
      console.log(`${PPREVIEW_LOG_PREFIX} Page ${pageIndex + 1} loaded. Original rotation: ${page.rotate}`);

      // Calculate total rotation (PDF's inherent rotation + dynamic rotation)
      // Normalize to ensure it's one of 0, 90, 180, 270
      const normalizedDynamicRotation = rotation % 360;
      const totalRotation = (page.rotate + normalizedDynamicRotation + 360) % 360;
      console.log(`${PPREVIEW_LOG_PREFIX} Dynamic rotation: ${normalizedDynamicRotation}, Total effective rotation: ${totalRotation}`);
      
      // Get viewport at scale 1 with the total rotation to determine aspect ratio
      const viewportAtScale1 = page.getViewport({ scale: 1, rotation: totalRotation });
      console.log(`${PPREVIEW_LOG_PREFIX} Viewport at scale 1 & totalRotation ${totalRotation}: W=${viewportAtScale1.width.toFixed(2)}, H=${viewportAtScale1.height.toFixed(2)}`);

      if (viewportAtScale1.height <= 0 || viewportAtScale1.width <= 0) {
        console.error(`${PPREVIEW_LOG_PREFIX} Viewport at scale 1 has invalid dimensions.`);
        throw new Error("Page has zero or negative dimension at scale 1.");
      }

      const scale = targetHeight / viewportAtScale1.height;
      console.log(`${PPREVIEW_LOG_PREFIX} Calculated scale: ${scale.toFixed(4)} (targetHeight: ${targetHeight} / vpScale1.height: ${viewportAtScale1.height.toFixed(2)})`);

      if (!Number.isFinite(scale) || scale <= 0) {
        console.error(`${PPREVIEW_LOG_PREFIX} Invalid scale calculated: ${scale}.`);
        throw new Error("Invalid scale for rendering.");
      }

      const viewport = page.getViewport({ scale, rotation: totalRotation });
      console.log(`${PPREVIEW_LOG_PREFIX} Final viewport: W=${viewport.width.toFixed(2)}, H=${viewport.height.toFixed(2)}, Scale=${viewport.scale.toFixed(4)}, Rot=${viewport.rotation}`);

      if (viewport.width <= 0 || viewport.height <= 0) {
        console.error(`${PPREVIEW_LOG_PREFIX} Final viewport dimensions are invalid.`);
        throw new Error("Calculated viewport for rendering has invalid dimensions.");
      }

      const context = canvas.getContext('2d');
      if (!context) {
        console.error(`${PPREVIEW_LOG_PREFIX} Could not get canvas 2D context.`);
        throw new Error('Could not get canvas context.');
      }

      canvas.height = Math.round(viewport.height); // Use Math.round to avoid fractional pixels
      canvas.width = Math.round(viewport.width);
      setDimensions({ width: canvas.width, height: canvas.height });
      console.log(`${PPREVIEW_LOG_PREFIX} Canvas dimensions set: W=${canvas.width}, H=${canvas.height}`);

      const renderContext: RenderParameters = {
        canvasContext: context,
        viewport: viewport,
      };
      console.log(`${PPREVIEW_LOG_PREFIX} Starting page.render()...`);
      await page.render(renderContext).promise;
      console.log(`${PPREVIEW_LOG_PREFIX} page.render() completed successfully.`);

    } catch (err: any) {
      console.error(`${PPREVIEW_LOG_PREFIX} Error during renderPage:`, err);
      setError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
    } finally {
      setLoading(false);
      console.log(`${PPREVIEW_LOG_PREFIX} Loading set to false in finally block.`);
    }
  }, [pdfDataUri, pageIndex, rotation, targetHeight]);

  useEffect(() => {
    // This effect runs when renderPage (and its dependencies) change.
    // renderPage itself is memoized by useCallback.
    renderPage();
  }, [renderPage]);

  if (loading) {
    const approxWidth = targetHeight * (210/297); // A4-like ratio for skeleton
    return (
        <Skeleton 
            className={cn("rounded-md bg-muted/50", className)} 
            style={{ height: `${targetHeight}px`, width: `${Math.max(50, approxWidth)}px` }}
            aria-label={`Loading preview for page ${pageIndex + 1}`}
        />
    );
  }

  if (error) {
    const approxWidth = targetHeight * (210/297);
    return (
      <div 
        className={cn("flex flex-col items-center justify-center bg-destructive/10 border border-destructive text-destructive-foreground rounded-md p-2 text-xs text-center", className)} 
        style={{ height: `${targetHeight}px`, width: `${Math.max(80, approxWidth)}px` }}
        title={error}
      >
        <FileWarning className="h-5 w-5 mb-1" />
        <p className="leading-tight line-clamp-3">Page {pageIndex + 1}: Error</p>
        {/* <p className="leading-tight line-clamp-3">{error}</p> More detailed error for debugging */}
      </div>
    );
  }
  
  // If dimensions are not set, or width/height is 0 after loading (and no error), show placeholder
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    const approxWidth = targetHeight * (210/297);
    return (
        <div 
            className={cn("flex flex-col items-center justify-center bg-yellow-50 border border-yellow-400 text-yellow-700 rounded-md p-2 text-xs text-center", className)} 
            style={{ height: `${targetHeight}px`, width: `${Math.max(80, approxWidth)}px` }}
            aria-label={`Preview for page ${pageIndex + 1} has invalid dimensions`}
        >
            <FileWarning className="h-5 w-5 mb-1 text-yellow-600" />
            <p className="leading-tight">Page {pageIndex + 1}: Invalid preview size</p>
        </div>
    );
  }
  
  // Only render canvas if all checks passed and dimensions are valid
  return (
    <canvas
      ref={canvasRef}
      className={cn("border border-muted shadow-sm rounded-md bg-white", className)}
      // HTML attributes width/height are set by canvas.width/height in renderPage
      // Style attributes are for CSS layout, but canvas intrinsic size is set by its width/height attributes
      style={{ 
        display: 'block', // Ensure canvas is treated as a block for layout
        width: `${dimensions.width}px`, 
        height: `${dimensions.height}px`
      }}
      role="img"
      aria-label={`Preview of PDF page ${pageIndex + 1}`}
    />
  );
};

export default PdfPagePreview;