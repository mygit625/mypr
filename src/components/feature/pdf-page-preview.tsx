'use client';

import type { VersionResponses } from 'pdfjs-dist';
import React, { useRef, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure pdf.js worker
if (typeof window !== 'undefined') {
  import('pdfjs-dist/build/pdf.worker.mjs')
    .then(workerModule => {
      if (workerModule.default) {
        // Check if default is a valid path or constructor (less likely for modern pdf.worker.mjs)
        console.log('Attempting to use workerModule.default for pdf.js workerSrc');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
      } else {
        // For pdfjs-dist v3+ and ES module workers, the module namespace itself might be expected.
        console.warn('workerModule.default not found. Attempting to use the entire workerModule for pdf.js workerSrc.');
        // The 'as any' is to bypass TypeScript complaints if workerModule type doesn't directly match string | Worker.
        // pdf.js internally handles this if 'workerModule' is the correct type of object (e.g. a worker constructor or module).
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule as any;
      }
    })
    .catch(error => {
      console.error("Failed to initialize pdf.js worker from module, falling back to CDN. Error:", error);
      const pdfjsVersion = (pdfjsLib as any).version;
      if (pdfjsVersion) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
      } else {
        // Fallback to a known recent version if somehow pdfjsLib.version is not available
        console.warn("pdfjsLib.version not available, using a hardcoded CDN version for pdf.worker.min.js");
        // Ensure this version matches your installed pdfjs-dist version for compatibility.
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js`;
      }
    });
}


interface PdfPagePreviewProps {
  pdfDataUri: string;
  pageIndex: number; // 0-based
  rotation: number; // 0, 90, 180, 270
  targetHeight: number;
  className?: string;
}

const PdfPagePreview: React.FC<PdfPagePreviewProps> = ({
  pdfDataUri,
  pageIndex,
  rotation,
  targetHeight,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setPageDimensions(null);

    if (!pdfDataUri || !canvasRef.current) {
      setIsLoading(false);
      if (!pdfDataUri) setError("No PDF data provided.");
      return;
    }

    const renderPage = async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) {
            setError("Canvas element not found.");
            setIsLoading(false);
            return;
        }
        const context = canvas.getContext('2d');
        if (!context) {
          setError("Could not get canvas context.");
          setIsLoading(false);
          return;
        }

        const base64String = pdfDataUri.substring(pdfDataUri.indexOf(',') + 1);
        const binaryString = window.atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
        const pdf: PDFDocumentProxy = await loadingTask.promise;
        
        if (pageIndex >= pdf.numPages) {
          setError(`Page index ${pageIndex} is out of bounds for PDF with ${pdf.numPages} pages.`);
          setIsLoading(false);
          return;
        }

        const page: PDFPageProxy = await pdf.getPage(pageIndex + 1); 

        const viewport = page.getViewport({ scale: 1, rotation: rotation });
        
        const scale = targetHeight / viewport.height;
        const scaledViewport = page.getViewport({ scale: scale, rotation: rotation });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        setPageDimensions({ width: scaledViewport.width, height: scaledViewport.height});

        const renderContext: RenderParameters = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        await page.render(renderContext).promise;
        
      } catch (e: any) {
        console.error(`Error rendering PDF page ${pageIndex}:`, e);
        setError(e.message || `Failed to render page ${pageIndex + 1}.`);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (pdfjsLib.GlobalWorkerOptions.workerSrc || typeof window === 'undefined') {
        renderPage();
    } else {
        const timer = setTimeout(() => {
            if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
                renderPage();
            } else {
                console.warn("PDF.js workerSrc still not set after delay. Rendering might fail or use fallback CDN.");
                // At this point, if workerSrc isn't set, renderPage() will likely use the CDN if catch block succeeded,
                // or it might fail if CDN also failed.
                // If the CDN fallback in the global scope failed to set workerSrc, renderPage will error out.
                // Forcing a re-check or calling renderPage assuming CDN might have been set.
                renderPage(); 
            }
        }, 1000); 
        return () => clearTimeout(timer);
    }
    
  }, [pdfDataUri, pageIndex, rotation, targetHeight]);

  const containerStyle: React.CSSProperties = {
    height: `${targetHeight}px`,
    width: pageDimensions ? `${pageDimensions.width}px` : 'auto',
    maxWidth: '100%',
    margin: '0 auto', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  
  return (
    <div 
        className={cn(
            "bg-background rounded border-2 border-dashed border-border text-muted-foreground overflow-hidden relative",
            "flex items-center justify-center", 
            className
        )}
        style={containerStyle}
        data-ai-hint="page preview"
    >
      {isLoading && (
        <Skeleton className="w-full h-full" />
      )}
      {!isLoading && error && (
        <div className="p-2 text-center text-xs text-destructive flex flex-col items-center justify-center">
          <FileWarning className="h-6 w-6 mb-1" />
          <span>Error rendering preview.</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={cn(isLoading || error ? 'hidden' : 'block', 'max-w-full max-h-full object-contain')}
      />
    </div>
  );
};

export default PdfPagePreview;