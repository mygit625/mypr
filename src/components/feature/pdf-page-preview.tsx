"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// Ensure workerSrc is set correctly
if (typeof window !== 'undefined') {
  // Match this with your pdfjs-dist version from package.json
  const PDF_JS_VERSION = "4.4.168"; 
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;
}

interface PdfPagePreviewProps {
  pdfDataUri: string;
  pageIndex: number; // 0-indexed
  rotation?: number; // Additional rotation: 0, 90, 180, 270
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
    console.log(`PdfPagePreview: Render attempt for pageIndex ${pageIndex}. pdfDataUri present: ${!!pdfDataUri}, canvasRef present: ${!!canvasRef.current}`);
    
    const canvas = canvasRef.current; // Capture canvasRef.current early

    if (!pdfDataUri || !canvas) {
        console.log(`PdfPagePreview: Bailing early for pageIndex ${pageIndex} - no pdfDataUri (${!!pdfDataUri}) or canvasRef (${!!canvas}).`);
        // If bailing early, ensure loading reflects this. If pdfDataUri is missing, it's not truly "loading" the PDF.
        // If canvas is missing, it's a lifecycle issue, useEffect might rerun.
        // Setting loading to false here if pdfDataUri is absent might be appropriate if it's not expected to arrive.
        // However, parent controls pdfDataUri, so this component should reflect loading until data is ready.
        // If canvas is null but pdfDataUri is present, it's a genuine loading/setup phase.
        if (!pdfDataUri) setLoading(false); // Stop loading if no data URI to process
        return;
    }

    setLoading(true);
    setError(null);
    setDimensions(null); 
    console.log(`PdfPagePreview: Set loading=true for pageIndex ${pageIndex}`);

    try {
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          console.error("PdfPagePreview: pdf.js workerSrc not set prior to rendering attempt!");
          setError("PDF worker not configured. Please refresh.");
          return; 
      }
      
      const base64Marker = ';base64,';
      const base64Index = pdfDataUri.indexOf(base64Marker);

      if (base64Index === -1) {
          console.error(`PdfPagePreview: Invalid PDF data URI for pageIndex ${pageIndex} - missing 'base64,' marker.`);
          throw new Error("Invalid PDF data URI format.");
      }
      const pdfData = atob(pdfDataUri.substring(base64Index + base64Marker.length));
      
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf: PDFDocumentProxy = await loadingTask.promise;
      
      if (pageIndex >= pdf.numPages) {
        console.error(`PdfPagePreview: Page index ${pageIndex} out of bounds for PDF with ${pdf.numPages} pages.`);
        setError(`Page index ${pageIndex + 1} out of bounds (Total: ${pdf.numPages}).`);
        return; 
      }
      const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); // pdf.js pages are 1-indexed

      const totalRotation = (page.rotate + rotation) % 360;
      const viewportUnscaled = page.getViewport({ scale: 1, rotation: page.rotate }); 
      
      let scale: number;
      if (totalRotation === 90 || totalRotation === 270) { 
        scale = targetHeight / viewportUnscaled.width;
      } else { 
        scale = targetHeight / viewportUnscaled.height;
      }
      
      const viewport = page.getViewport({ scale, rotation: totalRotation });
      
      if (viewport.width <= 0 || viewport.height <= 0 || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || !Number.isFinite(scale)) {
        console.error(`PdfPagePreview: Invalid viewport dimensions for pageIndex ${pageIndex}. W=${viewport.width}, H=${viewport.height}, Scale=${scale}. Original Page Rot: ${page.rotate}, Added Rot: ${rotation}`);
        setError(`Page ${pageIndex + 1}: Invalid calculated size.`);
        return;
      }
      console.log(`PdfPagePreview: Viewport calculated for pageIndex ${pageIndex}. Scale: ${scale.toFixed(2)}, Rot: ${totalRotation}, W: ${viewport.width.toFixed(0)}, H: ${viewport.height.toFixed(0)}`);

      const context = canvas.getContext('2d');
      if (!context) {
        console.error(`PdfPagePreview: Could not get canvas 2D context for pageIndex ${pageIndex}.`);
        setError('Could not get canvas context.');
        return;
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      setDimensions({ width: viewport.width, height: viewport.height });
      console.log(`PdfPagePreview: Canvas dimensions set for pageIndex ${pageIndex}: ${viewport.width.toFixed(0)}x${viewport.height.toFixed(0)}`);

      const renderContext: RenderParameters = {
        canvasContext: context,
        viewport: viewport,
      };
      console.log(`PdfPagePreview: Starting page.render for pageIndex ${pageIndex}`);
      await page.render(renderContext).promise;
      console.log(`PdfPagePreview: page.render completed successfully for pageIndex ${pageIndex}`);

    } catch (err: any) {
      console.error(`PdfPagePreview: Error during renderPage for pageIndex ${pageIndex}:`, err);
      setError(err.message || `Failed to render PDF page ${pageIndex + 1}.`);
    } finally {
      setLoading(false);
      console.log(`PdfPagePreview: Set loading=false for pageIndex ${pageIndex} in finally block.`);
    }
  }, [pdfDataUri, pageIndex, rotation, targetHeight]);

  useEffect(() => {
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
        <p className="leading-tight line-clamp-3">Page {pageIndex + 1}: {error}</p>
      </div>
    );
  }

  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    console.warn(`PdfPagePreview: Rendering placeholder for pageIndex ${pageIndex} because dimensions are invalid/missing post-load. Dimensions:`, dimensions);
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
      style={{ 
        // width and height style attributes are now set based on valid dimensions
        width: `${dimensions.width}px`, 
        height: `${dimensions.height}px`
      }}
      // HTML attributes width/height are set by canvas.width/height in renderPage
      role="img"
      aria-label={`Preview of PDF page ${pageIndex + 1}`}
    />
  );
};

export default PdfPagePreview;
