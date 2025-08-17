
"use client";

import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Crop, Download, Upload, Loader2, Info, ArrowLeft, ArrowRight, Scissors, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { getInitialPageDataAction, cropPdfAction, type PageData } from './actions';
import { PageConfetti } from '@/components/ui/page-confetti';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import PdfPagePreview from '@/components/feature/pdf-page-preview';

type InteractionMode =
  | 'move'
  | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl'
  | 'resize-t' | 'resize-b' | 'resize-l' | 'resize-r'
  | null;

export default function CropPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [croppedPdfUri, setCroppedPdfUri] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [interaction, setInteraction] = useState<InteractionMode>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startCropBox, setStartCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropMode, setCropMode] = useState<'all' | 'current'>('all');

  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setPdfDataUri(null);
    setPages([]);
    setTotalPages(0);
    setCurrentPage(1);
    setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    setCroppedPdfUri(null);
    setShowConfetti(false);
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
        setPdfDataUri(dataUri);
        const result = await getInitialPageDataAction({ pdfDataUri: dataUri });
        if (result.error) throw new Error(result.error);
        if (result.pages) {
          setPages(result.pages);
          setTotalPages(result.pages.length);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load PDF.');
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const currentPageData = pages[currentPage - 1];

  useEffect(() => {
    if (containerRef.current && currentPageData) {
      const { clientWidth: cWidth, clientHeight: cHeight } = containerRef.current;
      
      const isSideways = currentPageData.rotation === 90 || currentPageData.rotation === 270;
      const visualPageWidth = isSideways ? currentPageData.height : currentPageData.width;
      const visualPageHeight = isSideways ? currentPageData.width : currentPageData.height;

      const scale = Math.min(cWidth / visualPageWidth, cHeight / visualPageHeight);
      const scaledWidth = visualPageWidth * scale;
      const scaledHeight = visualPageHeight * scale;

      const newWidth = scaledWidth * 0.8;
      const newHeight = scaledHeight * 0.8;
      const newX = (cWidth - newWidth) / 2;
      const newY = (cHeight - newHeight) / 2;
      
      setCropBox({ x: newX, y: newY, width: newWidth, height: newHeight });
    }
  }, [currentPageData]);


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
    if (!pdfDataUri || !containerRef.current) return;
    setIsProcessing(true);
    setError(null);
    try {
      const { clientWidth, clientHeight } = containerRef.current;
      const result = await cropPdfAction({
        pdfDataUri,
        cropArea: cropBox,
        applyTo: cropMode,
        currentPage,
        clientCanvasWidth: clientWidth,
        clientCanvasHeight: clientHeight,
      });

      if (result.error) throw new Error(result.error);
      if (result.croppedPdfDataUri) {
        setCroppedPdfUri(result.croppedPdfDataUri);
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
    if(croppedPdfUri && file) {
      downloadDataUri(croppedPdfUri, `cropped_${file.name}`);
    }
  };
  
  const resizeHandleClasses = "absolute w-3 h-3 bg-primary rounded-full border-2 border-white";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <PageConfetti active={showConfetti} />
      <header className="text-center py-8">
        <Crop className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Crop PDF</h1>
        <p className="text-muted-foreground mt-2">Crop your PDF pages by selecting a visual area.</p>
      </header>
      
      {!file && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader><CardTitle>Upload PDF</CardTitle><CardDescription>Select or drag a PDF file to begin cropping.</CardDescription></CardHeader>
          <CardContent><FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" /></CardContent>
        </Card>
      )}

      {isLoading && <div className="text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}
      
      {file && pdfDataUri && pages.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div
                  ref={containerRef}
                  className="relative w-full h-[70vh] bg-muted/30 overflow-hidden touch-none select-none flex items-center justify-center"
                  onMouseMove={handleInteractionMove} onMouseUp={endInteraction} onMouseLeave={endInteraction}
                  onTouchMove={handleInteractionMove} onTouchEnd={endInteraction}
                >
                  {currentPageData && (
                    <PdfPagePreview
                      pdfDataUri={pdfDataUri}
                      pageIndex={currentPageData.originalIndex}
                      targetHeight={containerRef.current ? containerRef.current.clientHeight - 20 : 600}
                    />
                  )}
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
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Crop Options</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Alert><Info className="h-4 w-4" /><AlertDescription>Draw the area you want to keep on the PDF preview.</AlertDescription></Alert>
                <RadioGroup value={cropMode} onValueChange={(v) => setCropMode(v as any)}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="all" /><Label htmlFor="all">Apply crop to all pages</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="current" id="current" /><Label htmlFor="current">Only crop current page ({currentPage})</Label></div>
                </RadioGroup>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                 {croppedPdfUri ? (
                    <>
                        <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg"><Download className="mr-2 h-5 w-5"/> Download Cropped PDF</Button>
                        <Button onClick={resetState} className="w-full" variant="outline">Start Over</Button>
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
      )}
      
      {error && (
        <Alert variant="destructive" className="max-w-2xl mx-auto"><Info className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      )}

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Use Our Free Online PDF Cropper</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center"><div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4"><FileUp className="h-8 w-8" /></div><h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3><p className="text-muted-foreground">Click the upload button or drag and drop your file into the designated area. Your file is processed securely.</p></div>
            <div className="flex flex-col items-center"><div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4"><MousePointerClick className="h-8 w-8" /></div><h3 className="text-xl font-semibold mb-2">2. Select Your Crop Area</h3><p className="text-muted-foreground">A preview of your PDF page will appear. Click and drag on the page to draw a crop box. Adjust the box by dragging its edges and corners.</p></div>
            <div className="flex flex-col items-center"><div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4"><DownloadCloud className="h-8 w-8" /></div><h3 className="text-xl font-semibold mb-2">3. Crop and Download</h3><p className="text-muted-foreground">Choose to apply the crop to a single page or all pages, then click the "Crop PDF" button. Download your perfectly cropped PDF instantly.</p></div>
          </div>
        </section>
        <section>
          <div className="text-center mb-12"><HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" /><h2 className="text-3xl font-bold">Frequently Asked Questions</h2></div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1"><AccordionTrigger className="text-lg text-left">Is this PDF cropping tool free to use?</AccordionTrigger><AccordionContent className="text-base text-muted-foreground">Yes, absolutely. Our online PDF cropper is completely free to use. There are no hidden fees, watermarks, or sign-up requirements. You can crop as many PDF files as you need.</AccordionContent></AccordionItem>
            <AccordionItem value="item-2"><AccordionTrigger className="text-lg text-left">Are my uploaded files secure?</AccordionTrigger><AccordionContent className="text-base text-muted-foreground">We prioritize your privacy and security. The entire cropping process happens securely on our servers, and your files are automatically deleted after one hour.</AccordionContent></AccordionItem>
            <AccordionItem value="item-3"><AccordionTrigger className="text-lg text-left">Can I crop multiple pages of a PDF at once?</AccordionTrigger><AccordionContent className="text-base text-muted-foreground">Yes, you can. After defining your crop area on a single page, you have the option to apply that same crop selection to all pages in the document. This is perfect for consistently removing headers, footers, or margins from an entire file.</AccordionContent></AccordionItem>
            <AccordionItem value="item-4"><AccordionTrigger className="text-lg text-left">Will cropping a PDF reduce its quality?</AccordionTrigger><AccordionContent className="text-base text-muted-foreground">No, our tool is designed to maintain the highest possible quality. When you crop a PDF, we don't re-compress the content within your selected area. The text, images, and graphics will retain their original clarity and resolution.</AccordionContent></AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
