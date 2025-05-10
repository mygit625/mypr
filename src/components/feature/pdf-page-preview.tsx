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

    if (!pdfDataUri || !canvasRef.current) {
        console.log(`PdfPagePreview: Bailing early for pageIndex ${pageIndex} - no pdfDataUri or canvasRef.`);
        // If this is an initial call where pdfDataUri is null, loading is true by default and stays true.
        // If pdfDataUri becomes null after being valid, component might be unmounted by parent.
        // If canvasRef.current is null, it's likely too early in lifecycle, useEffect should re-run.
        // No explicit setLoading(false) here, relies on initial state or subsequent calls.
        return;
    }

    setLoading(true);
    setError(null);
    setDimensions(null); // Reset dimensions on new render attempt
    console.log(`PdfPagePreview: Set loading=true for pageIndex ${pageIndex}`);

    try {
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          console.error("PdfPagePreview: pdf.js workerSrc not set prior to rendering attempt!");
          setError("PDF worker not configured. Please refresh.");
          // setLoading(false) will be handled by finally
          return; 
      }
      console.log(`PdfPagePreview: Using workerSrc: ${pdfjsLib.GlobalWorkerOptions.workerSrc} for pageIndex ${pageIndex}`);
      
      const base64Marker = ';base64,';
      const base64Index = pdfDataUri.indexOf(base64Marker);

      if (base64Index === -1) {
          console.error(`PdfPagePreview: Invalid PDF data URI for pageIndex ${pageIndex} - missing 'base64,' marker.`);
          throw new Error("Invalid PDF data URI format.");
      }
      const pdfData = atob(pdfDataUri.substring(base64Index + base64Marker.length));
      console.log(`PdfPagePreview: Decoded PDF data (length: ${pdfData.length}) for pageIndex ${pageIndex}`);
      
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf: PDFDocumentProxy = await loadingTask.promise;
      console.log(`PdfPagePreview: PDF document loaded for pageIndex ${pageIndex}. Total pages: ${pdf.numPages}`);
      
      if (pageIndex >= pdf.numPages) {
        console.error(`PdfPagePreview: Page index ${pageIndex} out of bounds for PDF with ${pdf.numPages} pages.`);
        setError(`Page index ${pageIndex} out of bounds (Total: ${pdf.numPages}).`);
        // setLoading(false) will be handled by finally
        return; 
      }
      const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); // pdf.js pages are 1-indexed
      console.log(`PdfPagePreview: Page ${pageIndex + 1} (original index ${pageIndex}) obtained.`);

      const totalRotation = (page.rotate + rotation) % 360;
      const viewportUnscaled = page.getViewport({ scale: 1, rotation: page.rotate }); // Use page's own rotation for natural dimensions
      
      let scale: number;
      if (totalRotation === 90 || totalRotation === 270) { // Final display is landscape
        scale = targetHeight / viewportUnscaled.width;
      } else { // Final display is portrait
        scale = targetHeight / viewportUnscaled.height;
      }
      
      const viewport = page.getViewport({ scale, rotation: totalRotation });
      console.log(`PdfPagePreview: Viewport calculated for pageIndex ${pageIndex}. Scale: ${scale.toFixed(2)}, Rot: ${totalRotation}, W: ${viewport.width.toFixed(0)}, H: ${viewport.height.toFixed(0)}`);

      const canvas = canvasRef.current; // Already checked not null
      const context = canvas!.getContext('2d');
      if (!context) {
        console.error(`PdfPagePreview: Could not get canvas 2D context for pageIndex ${pageIndex}.`);
        setError('Could not get canvas context.');
        // setLoading(false) will be handled by finally
        return;
      }

      canvas!.height = viewport.height;
      canvas!.width = viewport.width;
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
    const approxWidth = targetHeight * (210/297); // A4-like ratio
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
        <p className="leading-tight">Page {pageIndex + 1} Preview Error</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("border border-muted shadow-sm rounded-md bg-white", className)} // Added bg-white for loaded state
      style={{ 
        display: (loading || error || !dimensions) ? 'none' : 'block', // Hide if loading, error, or no dimensions
        width: dimensions?.width ? `${dimensions.width}px` : 'auto', 
        height: dimensions?.height ? `${dimensions.height}px`: 'auto'
      }}
      role="img"
      aria-label={`Preview of PDF page ${pageIndex + 1}`}
    />
  );
};

export default PdfPagePreview;
