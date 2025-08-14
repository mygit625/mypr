
"use client";

import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Crop, Download, Upload, Loader2, Info, ArrowLeft, ArrowRight, Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cropPdfAction, type CropArea } from './actions';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

type InteractionMode = 'move' | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl' | null;

export default function CropPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 }); // in percentages
  const [croppedPdfUri, setCroppedPdfUri] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [interaction, setInteraction] = useState<InteractionMode>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startCropBox, setStartCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropMode, setCropMode] = useState<'all' | 'current'>('all');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    setCroppedPdfUri(null);
    setIsLoading(false);
    setIsProcessing(false);
    setError(null);
  };

  const handleFileSelected = async (files: File[]) => {
    if (files.length > 0) {
      resetState();
      const selectedFile = files[0];
      setFile(selectedFile);
      setIsLoading(true);
      try {
        const dataUri = await readFileAsDataURL(selectedFile);
        const loadingTask = pdfjsLib.getDocument(dataUri);
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (e: any) {
        setError(e.message || 'Failed to load PDF.');
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderPage = async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(container.clientWidth / viewport.width, container.clientHeight / viewport.height);
      const scaledViewport = page.getViewport({ scale });
      
      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;
      
      const context = canvas.getContext('2d');
      if (context) {
        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
      }
    } catch (e: any) {
      setError(`Failed to render page ${pageNumber}: ${e.message}`);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage]);

  const getRelativeCoords = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width * 100,
      y: (clientY - rect.top) / rect.height * 100,
    };
  };

  const startInteraction = (e: ReactMouseEvent | ReactTouchEvent, mode: InteractionMode) => {
    e.preventDefault();
    e.stopPropagation();
    setInteraction(mode);
    setStartPos(getRelativeCoords(e));
    setStartCropBox(cropBox);
  };

  const handleInteractionMove = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (!interaction) return;
    e.preventDefault();
    e.stopPropagation();
    const currentPos = getRelativeCoords(e);
    const dx = currentPos.x - startPos.x;
    const dy = currentPos.y - startPos.y;

    let newX = startCropBox.x;
    let newY = startCropBox.y;
    let newWidth = startCropBox.width;
    let newHeight = startCropBox.height;

    switch (interaction) {
        case 'move':
            newX = startCropBox.x + dx;
            newY = startCropBox.y + dy;
            break;
        case 'resize-br':
            newWidth = startCropBox.width + dx;
            newHeight = startCropBox.height + dy;
            break;
        case 'resize-bl':
            newX = startCropBox.x + dx;
            newWidth = startCropBox.width - dx;
            newHeight = startCropBox.height + dy;
            break;
        case 'resize-tr':
            newY = startCropBox.y + dy;
            newWidth = startCropBox.width + dx;
            newHeight = startCropBox.height - dy;
            break;
        case 'resize-tl':
            newX = startCropBox.x + dx;
            newY = startCropBox.y + dy;
            newWidth = startCropBox.width - dx;
            newHeight = startCropBox.height - dy;
            break;
    }
    
    // Clamp values to be within bounds [0, 100] and have minimum size
    newWidth = Math.max(5, newWidth);
    newHeight = Math.max(5, newHeight);

    newX = Math.max(0, Math.min(newX, 100 - newWidth));
    newY = Math.max(0, Math.min(newY, 100 - newHeight));
    
    // Ensure width/height don't go beyond boundaries from the new X/Y
    newWidth = Math.min(newWidth, 100 - newX);
    newHeight = Math.min(newHeight, 100 - newY);

    setCropBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const endInteraction = () => {
    setInteraction(null);
  };
  
  const handleCrop = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    try {
      const pdfDataUri = await readFileAsDataURL(file);
      const result = await cropPdfAction({
        pdfDataUri,
        cropArea: {
            x: cropBox.x / 100,
            y: cropBox.y / 100,
            width: cropBox.width / 100,
            height: cropBox.height / 100,
        },
        applyTo: cropMode,
        currentPage: currentPage,
      });

      if (result.error) throw new Error(result.error);
      if (result.croppedPdfDataUri) {
        setCroppedPdfUri(result.croppedPdfDataUri);
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
    if(croppedPdfUri && file) {
      downloadDataUri(croppedPdfUri, `cropped_${file.name}`);
    }
  };
  
  const resizeHandleClasses = "absolute w-3 h-3 bg-primary rounded-full border-2 border-white";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center py-8">
        <Crop className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Crop PDF</h1>
        <p className="text-muted-foreground mt-2">Crop your PDF pages by selecting a visual area.</p>
      </header>
      
      {!file && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>Select or drag a PDF file to begin cropping.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
          </CardContent>
        </Card>
      )}

      {isLoading && <div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}
      
      {file && pdfDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div
                  ref={containerRef}
                  className="relative w-full h-[70vh] bg-muted/30 overflow-hidden touch-none select-none"
                  onMouseMove={handleInteractionMove}
                  onMouseUp={endInteraction}
                  onMouseLeave={endInteraction}
                  onTouchMove={handleInteractionMove}
                  onTouchEnd={endInteraction}
                >
                  <canvas ref={canvasRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  <div
                    className="absolute border-2 border-dashed border-primary bg-primary/20 cursor-move"
                    style={{ 
                      left: `${cropBox.x}%`, 
                      top: `${cropBox.y}%`, 
                      width: `${cropBox.width}%`, 
                      height: `${cropBox.height}%` 
                    }}
                    onMouseDown={(e) => startInteraction(e, 'move')}
                    onTouchStart={(e) => startInteraction(e, 'move')}
                  >
                    <div className={cn(resizeHandleClasses, "-top-1.5 -left-1.5 cursor-nwse-resize")} onMouseDown={(e) => startInteraction(e, 'resize-tl')} onTouchStart={(e) => startInteraction(e, 'resize-tl')} />
                    <div className={cn(resizeHandleClasses, "-top-1.5 -right-1.5 cursor-nesw-resize")} onMouseDown={(e) => startInteraction(e, 'resize-tr')} onTouchStart={(e) => startInteraction(e, 'resize-tr')} />
                    <div className={cn(resizeHandleClasses, "-bottom-1.5 -left-1.5 cursor-nesw-resize")} onMouseDown={(e) => startInteraction(e, 'resize-bl')} onTouchStart={(e) => startInteraction(e, 'resize-bl')} />
                    <div className={cn(resizeHandleClasses, "-bottom-1.5 -right-1.5 cursor-nwse-resize")} onMouseDown={(e) => startInteraction(e, 'resize-br')} onTouchStart={(e) => startInteraction(e, 'resize-br')} />
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
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Crop Options</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        Draw the area you want to keep on the PDF preview.
                    </AlertDescription>
                </Alert>
                <RadioGroup value={cropMode} onValueChange={(v) => setCropMode(v as any)}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all">Apply crop to all pages</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="current" id="current" />
                        <Label htmlFor="current">Only crop current page ({currentPage})</Label>
                    </div>
                </RadioGroup>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                 {croppedPdfUri ? (
                    <>
                        <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg">
                            <Download className="mr-2 h-5 w-5"/> Download Cropped PDF
                        </Button>
                        <Button onClick={resetState} className="w-full" variant="outline">
                            Start Over
                        </Button>
                    </>
                ) : (
                    <Button onClick={handleCrop} disabled={isProcessing} className="w-full" size="lg">
                        {isProcessing ? <Loader2 className="mr-2 animate-spin" /> : <Scissors className="mr-2" />}
                        Crop PDF
                    </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
