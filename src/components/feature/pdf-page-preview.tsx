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
    if (!pdfDataUri || !canvasRef.current) return;

    setLoading(true);
    setError(null);
    setDimensions(null);

    try {
      // Decode base64 data URI
      const pdfData = atob(pdfDataUri.substring(pdfDataUri.indexOf(',') + 1));
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      
      if (pageIndex >= pdf.numPages) {
        setError(`Page index ${pageIndex} out of bounds (Total: ${pdf.numPages}).`);
        setLoading(false);
        return;
      }
      const page = await pdf.getPage(pageIndex + 1); // pdf.js pages are 1-indexed

      // Calculate viewport based on target height and page's own rotation + additional rotation
      const totalRotation = (page.rotate + rotation) % 360;
      
      // Get viewport at scale 1 with its original rotation to determine natural dimensions
      const viewportUnscaled = page.getViewport({ scale: 1, rotation: page.rotate });
      
      let scale: number;
      // Determine scale based on whether the *final displayed orientation* is portrait or landscape
      if (totalRotation === 90 || totalRotation === 270) { // Effectively landscape
        scale = targetHeight / viewportUnscaled.width;
      } else { // Effectively portrait
        scale = targetHeight / viewportUnscaled.height;
      }
      
      const viewport = page.getViewport({ scale, rotation: totalRotation });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) {
        setError('Could not get canvas context.');
        setLoading(false);
        return;
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      setDimensions({ width: viewport.width, height: viewport.height });

      const renderContext: RenderParameters = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;

    } catch (err: any) {
      console.error(`Error rendering PDF page ${pageIndex}:`, err);
      setError(err.message || 'Failed to render PDF page.');
    } finally {
      setLoading(false);
    }
  }, [pdfDataUri, pageIndex, rotation, targetHeight]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  if (loading) {
    // Calculate approximate width based on A4-like ratio for skeleton
    const approxWidth = targetHeight * (1 / Math.sqrt(2)); // Height * (Width/Height ratio of A4)
    return (
        <Skeleton 
            className={cn("rounded-md bg-muted/50", className)} 
            style={{ height: `${targetHeight}px`, width: `${Math.max(50, approxWidth)}px` }}
            aria-label="Loading PDF page preview"
        />
    );
  }

  if (error) {
    const approxWidth = targetHeight * (1 / Math.sqrt(2));
    return (
      <div 
        className={cn("flex flex-col items-center justify-center bg-destructive/10 border border-destructive text-destructive-foreground rounded-md p-2 text-xs text-center", className)} 
        style={{ height: `${targetHeight}px`, width: `${Math.max(80, approxWidth)}px` }}
        title={error}
      >
        <FileWarning className="h-5 w-5 mb-1" />
        <p className="leading-tight">Preview Error</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("border border-muted shadow-sm rounded-md", className)}
      style={{ display: (loading || !dimensions) ? 'none' : 'block', width: dimensions?.width, height: dimensions?.height }}
      role="img"
      aria-label={`Preview of PDF page ${pageIndex + 1}`}
    />
  );
};

export default PdfPagePreview;
