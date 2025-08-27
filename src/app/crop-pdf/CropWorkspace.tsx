
"use client";

// Polyfill for Promise.withResolvers is needed for some environments
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Crop, Download, Loader2, Info, ArrowLeft, ArrowRight, Scissors, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadDataUri } from '@/lib/download-utils';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { createPdfFromImagesAction } from './actions';
import { PageConfetti } from '@/components/ui/page-confetti';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

type InteractionMode =
  | 'move'
  | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl'
  | 'resize-t' | 'resize-b' | 'resize-l' | 'resize-r'
  | null;

interface CropWorkspaceProps {
    pdfDataUri: string;
    fileName: string;
    onReset: () => void;
}

export default function CropWorkspace({ pdfDataUri, fileName, onReset }: CropWorkspaceProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 200, height: 200 });
  const [croppedPdfUri, setCroppedPdfUri] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [interaction, setInteraction] = useState<InteractionMode>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startCropBox, setStartCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropMode, setCropMode] = useState<'all' | 'current'>('all');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  const renderTaskRef = useRef<any | null>(null);

  useEffect(() => {
    async function loadPdf() {
        setIsLoading(true);
        setError(null);
        try {
            const loadingTask = pdfjsLib.getDocument(pdfDataUri);
            const doc = await loadingTask.promise;
            setPdfDoc(doc);
            setTotalPages(doc.numPages);
            setCurrentPage(1);
        } catch (e: any) {
            setError(e.message || 'Failed to load PDF.');
            toast({ title: 'Error', description: e.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }
    if (pdfDataUri) {
        loadPdf();
    }
  }, [pdfDataUri, toast]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;
    
    let isCancelled = false;
    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(currentPage);
        const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current!;
        
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / viewport.width, containerHeight / viewport.height);
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const renderContext: RenderParameters = { canvasContext: context, viewport: scaledViewport };
        
        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        
        if (isCancelled) return;

        const initialWidth = canvas.width * 0.8;
        const initialHeight = canvas.height * 0.8;
        setCropBox({
            x: (containerWidth - initialWidth) / 2,
            y: (containerHeight - initialHeight) / 2,
            width: initialWidth,
            height: initialHeight,
        });
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException' && !isCancelled) {
            setError(e.message);
        }
      } finally {
        renderTaskRef.current = null;
      }
    };
    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage]);


  const getRelativeCoords = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startInteraction = (e: ReactMouseEvent | ReactTouchEvent, mode: InteractionMode) => {
    e.preventDefault();
    e.stopPropagation();
    setInteraction(mode);
    setStartPos(getRelativeCoords(e));
    setStartCropBox(cropBox);
  };

  const handleInteractionMove = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (!interaction || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const currentPos = getRelativeCoords(e);
    const { clientWidth: cWidth, clientHeight: cHeight } = containerRef.current;
    
    const dx = currentPos.x - startPos.x;
    const dy = currentPos.y - startPos.y;

    let { x: newX, y: newY, width: newWidth, height: newHeight } = startCropBox;

    switch (interaction) {
        case 'move': newX += dx; newY += dy; break;
        case 'resize-br': newWidth += dx; newHeight += dy; break;
        case 'resize-bl': newX += dx; newWidth -= dx; newHeight += dy; break;
        case 'resize-tr': newY += dy; newWidth += dx; newHeight -= dy; break;
        case 'resize-tl': newX += dx; newY += dy; newWidth -= dx; newHeight -= dy; break;
        case 'resize-t': newY += dy; newHeight -= dy; break;
        case 'resize-b': newHeight += dy; break;
        case 'resize-l': newX += dx; newWidth -= dx; break;
        case 'resize-r': newWidth += dx; break;
    }
    
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);
    newX = Math.max(0, Math.min(newX, cWidth - newWidth));
    newY = Math.max(0, Math.min(newY, cHeight - newHeight));
    newWidth = Math.min(newWidth, cWidth - newX);
    newHeight = Math.min(newHeight, cHeight - newY);

    setCropBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const endInteraction = () => setInteraction(null);
  
  const handleCrop = async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;
    setIsProcessing(true);
    setError(null);
    try {
      const pageIndices = cropMode === 'all' ? Array.from({ length: totalPages }, (_, i) => i + 1) : [currentPage];
      const imageDataUris: string[] = [];
      
      const mainCanvas = canvasRef.current;
      const container = containerRef.current;
      
      for(const pageNum of pageIndices) {
        const page = await pdfDoc.getPage(pageNum);
        const scale = 2.0; // Render at high resolution for cropping
        const viewport = page.getViewport({ scale });
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        
        await page.render({ canvasContext: tempCtx, viewport }).promise;
        
        // Calculate the scale ratio between the high-res temp canvas and the displayed canvas
        const scaleRatio = tempCanvas.width / mainCanvas.width;
        
        // Calculate the offset of the displayed canvas within its container
        const canvasOffsetX = (container.clientWidth - mainCanvas.width) / 2;
        const canvasOffsetY = (container.clientHeight - mainCanvas.height) / 2;

        // Translate the cropBox coordinates (relative to container) to be relative to the canvas content
        const sx_relative_to_canvas = cropBox.x - canvasOffsetX;
        const sy_relative_to_canvas = cropBox.y - canvasOffsetY;
        
        // Scale the canvas-relative coordinates to the high-res temporary canvas
        const sx = sx_relative_to_canvas * scaleRatio;
        const sy = sy_relative_to_canvas * scaleRatio;
        const sWidth = cropBox.width * scaleRatio;
        const sHeight = cropBox.height * scaleRatio;
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = sWidth;
        finalCanvas.height = sHeight;
        const finalCtx = finalCanvas.getContext('2d')!;
        finalCtx.drawImage(tempCanvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
        
        imageDataUris.push(finalCanvas.toDataURL('image/png'));
      }

      const result = await createPdfFromImagesAction({ imageDataUris });
      if (result.error) throw new Error(result.error);

      if (result.createdPdfDataUri) {
        setCroppedPdfUri(result.createdPdfDataUri);
        setShowConfetti(true);
        toast({ title: 'Success', description: 'PDF has been cropped.' });
      }

    } catch (e: any) {
        setError(e.message);
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleDownload = () => {
    if(croppedPdfUri && fileName) {
      downloadDataUri(croppedPdfUri, `cropped_${fileName}`);
    }
  };
  
  const resizeHandleClasses = "absolute w-3 h-3 bg-primary rounded-full border-2 border-white";

  if (isLoading) {
    return (
        <div className="flex justify-center items-center p-8 h-[70vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading PDF...</span>
        </div>
    )
  }

  if (error && !isProcessing) {
      return (
        <div className="space-y-4">
            <Alert variant="destructive" className="max-w-2xl mx-auto"><Info className="h-4 w-4" /><AlertTitle>Error Loading PDF</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            <div className="text-center">
                <Button onClick={onReset} variant="outline"><UploadCloud className="mr-2"/>Upload a Different File</Button>
            </div>
        </div>
      )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PageConfetti active={showConfetti} />
        <div className="lg:col-span-2 space-y-4">
        <Card>
            <CardContent className="p-4">
            <div
                ref={containerRef}
                className="relative w-full h-[70vh] bg-muted/30 overflow-hidden touch-none select-none flex items-center justify-center"
                onMouseMove={handleInteractionMove} onMouseUp={endInteraction} onMouseLeave={endInteraction}
                onTouchMove={handleInteractionMove} onTouchEnd={endInteraction}
            >
                <canvas ref={canvasRef} className="max-w-full max-h-full" />
                <div
                className="absolute border-2 border-dashed border-primary bg-primary/20 cursor-move"
                style={{ left: cropBox.x, top: cropBox.y, width: cropBox.width, height: cropBox.height }}
                onMouseDown={(e) => startInteraction(e, 'move')} onTouchStart={(e) => startInteraction(e, 'move')}
                >
                <div className={cn(resizeHandleClasses, "-top-1.5 -left-1.5 cursor-nwse-resize")} onMouseDown={(e) => startInteraction(e, 'resize-tl')} onTouchStart={(e) => startInteraction(e, 'resize-tl')} />
                <div className={cn(resizeHandleClasses, "-top-1.5 -right-1.5 cursor-nesw-resize")} onMouseDown={(e) => startInteraction(e, 'resize-tr')} onTouchStart={(e) => startInteraction(e, 'resize-tr')} />
                <div className={cn(resizeHandleClasses, "-bottom-1.5 -left-1.5 cursor-nesw-resize")} onMouseDown={(e) => startInteraction(e, 'resize-bl')} onTouchStart={(e) => startInteraction(e, 'resize-bl')} />
                <div className={cn(resizeHandleClasses, "-bottom-1.5 -right-1.5 cursor-nwse-resize")} onMouseDown={(e) => startInteraction(e, 'resize-br')} onTouchStart={(e) => startInteraction(e, 'resize-br')} />
                <div className={cn(resizeHandleClasses, "top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize")} onMouseDown={(e) => startInteraction(e, 'resize-l')} onTouchStart={(e) => startInteraction(e, 'resize-l')} />
                <div className={cn(resizeHandleClasses, "top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize")} onMouseDown={(e) => startInteraction(e, 'resize-r')} onTouchStart={(e) => startInteraction(e, 'resize-r')} />
                <div className={cn(resizeHandleClasses, "left-1/2 -translate-x-1/2 -top-1.5 cursor-ns-resize")} onMouseDown={(e) => startInteraction(e, 'resize-t')} onTouchStart={(e) => startInteraction(e, 'resize-t')} />
                <div className={cn(resizeHandleClasses, "left-1/2 -translate-x-1/2 -bottom-1.5 cursor-ns-resize")} onMouseDown={(e) => startInteraction(e, 'resize-b')} onTouchStart={(e) => startInteraction(e, 'resize-b')} />
                </div>
            </div>
            </CardContent>
        </Card>
        <div className="flex items-center justify-center gap-4">
            <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ArrowLeft className="mr-2"/> Previous</Button>
            <span className="font-medium">Page {currentPage} of {totalPages}</span>
            <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next <ArrowRight className="ml-2"/></Button>
        </div>
        </div>
        <div className="space-y-4 lg:sticky lg:top-20 self-start">
        <Card>
            <CardHeader><CardTitle>Crop Options</CardTitle></CardHeader>
            <CardContent className="space-y-4">
            <Alert><Info className="h-4 w-4" /><AlertDescription>Draw the area you want to keep on the PDF preview.</AlertDescription></Alert>
            <RadioGroup value={cropMode} onValueChange={(v) => setCropMode(v as 'all' | 'current')}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="all" /><Label htmlFor="all">Apply crop to all pages</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="current" id="current" /><Label htmlFor="current">Only crop current page ({currentPage})</Label></div>
            </RadioGroup>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                {croppedPdfUri ? (
                <>
                    <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg"><Download className="mr-2 h-5 w-5"/> Download Cropped PDF</Button>
                    <Button onClick={onReset} className="w-full" variant="outline">Start Over</Button>
                </>
                ) : (
                <Button onClick={handleCrop} disabled={isProcessing} className="w-full" size="lg">
                    {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <Scissors className="mr-2" />} Crop PDF
                </Button>
                )}
            </CardFooter>
        </Card>
        </div>
  </div>
  );
}
