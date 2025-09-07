
"use client";

import React, { useState, useEffect, useRef, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { createPdfFromImagesAction } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Scissors, Info, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadDataUri } from '@/lib/download-utils';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface CropArea {
  x: number; y: number; width: number; height: number;
}
interface CropWorkspaceProps {
  pdfFile: File;
  pdfDataUri: string;
  onReset: () => void;
}

export default function CropWorkspace({ pdfFile, pdfDataUri, onReset }: CropWorkspaceProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyTo, setApplyTo] = useState<'current' | 'all'>('current');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{ type: 'move' | 'resize' | null, startX: number, startY: number, startBox: CropArea | null }>({ type: null, startX: 0, startY: 0, startBox: null });

  const { toast } = useToast();

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfDataUri);
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (e: any) {
        setError("Error Loading PDF: " + e.message);
      }
    };
    loadPdf();
  }, [pdfDataUri]);

  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null;
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return;
      
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.5 });

      const scale = Math.min(container.clientWidth / viewport.width, container.clientHeight / viewport.height);
      const scaledViewport = page.getViewport({ scale });
      
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const renderContext: RenderParameters = { canvasContext: context, viewport: scaledViewport };
      renderTask = page.render(renderContext);
      await renderTask.promise;

      if (!cropArea) {
        setCropArea({
          x: canvas.width * 0.1,
          y: canvas.height * 0.1,
          width: canvas.width * 0.8,
          height: canvas.height * 0.8,
        });
      }
    };

    renderPage();
    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage]);

  const getRelativeCoords = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startInteraction = (clientX: number, clientY: number, type: 'move' | 'resize') => {
    if (!cropArea) return;
    const { x, y } = getRelativeCoords(clientX, clientY);
    interactionRef.current = { type, startX: x, startY: y, startBox: { ...cropArea } };
    setIsCropping(true);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseup', endInteraction);
    window.addEventListener('touchend', endInteraction);
  };

  const handleInteraction = (clientX: number, clientY: number) => {
    if (!interactionRef.current.type || !interactionRef.current.startBox) return;
    const { type, startX, startY, startBox } = interactionRef.current;
    const { x, y } = getRelativeCoords(clientX, clientY);
    const dx = x - startX;
    const dy = y - startY;
    const canvas = canvasRef.current!;

    let newBox = { ...startBox };
    if (type === 'move') {
      newBox.x = Math.max(0, Math.min(startBox.x + dx, canvas.width - startBox.width));
      newBox.y = Math.max(0, Math.min(startBox.y + dy, canvas.height - startBox.height));
    } else {
      newBox.width = Math.max(20, Math.min(startBox.width + dx, canvas.width - startBox.x));
      newBox.height = Math.max(20, Math.min(startBox.height + dy, canvas.height - startBox.y));
    }
    setCropArea(newBox);
  };

  const endInteraction = () => {
    setIsCropping(false);
    interactionRef.current = { type: null, startX: 0, startY: 0, startBox: null };
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('mouseup', endInteraction);
    window.removeEventListener('touchend', endInteraction);
  };

  const handleMouseDown = (e: ReactMouseEvent) => startInteraction(e.clientX, e.clientY, 'move');
  const handleResizeHandleMouseDown = (e: ReactMouseEvent) => { e.stopPropagation(); startInteraction(e.clientX, e.clientY, 'resize'); };
  const handleMouseMove = (e: MouseEvent) => handleInteraction(e.clientX, e.clientY);
  
  const handleTouchStart = (e: ReactTouchEvent) => startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'move');
  const handleResizeHandleTouchStart = (e: ReactTouchEvent) => { e.stopPropagation(); startInteraction(e.touches[0].clientX, e.touches[0].clientY, 'resize'); };
  const handleTouchMove = (e: TouchEvent) => handleInteraction(e.touches[0].clientX, e.touches[0].clientY);

  const handleCrop = async () => {
    if (!pdfDoc || !cropArea) return;
    setIsProcessing(true);
    setError(null);

    try {
      const pageIndices = applyTo === 'all' ? Array.from({ length: totalPages }, (_, i) => i + 1) : [currentPage];
      const croppedImageUris: string[] = [];

      for (const pageNum of pageIndices) {
        const page = await pdfDoc.getPage(pageNum);
        const originalViewport = page.getViewport({ scale: 1 });
        
        const canvas = canvasRef.current!;
        const scaleX = originalViewport.width / canvas.width;
        const scaleY = originalViewport.height / canvas.height;

        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) continue;
        
        const sx = cropArea.x * scaleX;
        const sy = cropArea.y * scaleY;
        const sWidth = cropArea.width * scaleX;
        const sHeight = cropArea.height * scaleY;
        
        cropCanvas.width = sWidth;
        cropCanvas.height = sHeight;

        // Render the full page at original resolution to an offscreen canvas
        const offscreenCanvas = document.createElement('canvas');
        const offscreenCtx = offscreenCanvas.getContext('2d');
        offscreenCanvas.width = originalViewport.width;
        offscreenCanvas.height = originalViewport.height;
        if (!offscreenCtx) continue;

        await page.render({ canvasContext: offscreenCtx, viewport: originalViewport }).promise;
        
        // Draw the cropped portion from the offscreen canvas to the crop canvas
        cropCtx.drawImage(offscreenCanvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
        
        croppedImageUris.push(cropCanvas.toDataURL('image/png'));
      }
      
      const result = await createPdfFromImagesAction({ imageUris: croppedImageUris });
      
      if (result.error) throw new Error(result.error);
      
      if (result.pdfDataUri) {
        downloadDataUri(result.pdfDataUri, `cropped_${pdfFile.name}`);
        toast({ title: 'Success!', description: 'Your cropped PDF has been downloaded.' });
      }

    } catch (e: any) {
      setError("Cropping failed: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Crop Your PDF</CardTitle>
        <CardDescription>
          Adjust the selection box on the preview. Select pages and click "Crop and Download".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
            <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        <div className="flex justify-center items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                <ChevronLeft />
            </Button>
            <span className="font-medium text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                <ChevronRight />
            </Button>
        </div>
        <div ref={containerRef} className="relative w-full max-w-full mx-auto bg-muted/30 flex justify-center items-center" style={{ height: '60vh' }}>
            <canvas ref={canvasRef} className="max-w-full max-h-full" />
            {cropArea && (
                <div
                    ref={cropBoxRef}
                    className="absolute border-2 border-dashed border-primary bg-primary/20 cursor-move"
                    style={{ left: cropArea.x, top: cropArea.y, width: cropArea.width, height: cropArea.height }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                >
                    <div
                        className="absolute -right-1 -bottom-1 w-4 h-4 bg-primary rounded-full cursor-nwse-resize"
                        onMouseDown={handleResizeHandleMouseDown}
                        onTouchStart={handleResizeHandleTouchStart}
                    />
                </div>
            )}
        </div>
         <RadioGroup value={applyTo} onValueChange={(val) => setApplyTo(val as 'current' | 'all')} className="flex justify-center gap-4 pt-2">
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="current" id="current" />
                <Label htmlFor="current">Apply to current page only</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">Apply to all pages</Label>
            </div>
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button onClick={handleCrop} disabled={isProcessing} className="w-full" size="lg">
            {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <Scissors className="mr-2" />} Crop and Download
        </Button>
        <Button onClick={onReset} variant="outline" className="w-full">
            <Upload className="mr-2" /> Upload a Different File
        </Button>
      </CardFooter>
    </Card>
  );
}

