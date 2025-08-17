"use client";

import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';

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
import { cropPdfAction } from './actions';
import { PageConfetti } from '@/components/ui/page-confetti';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

type InteractionMode =
  | 'move'
  | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl'
  | 'resize-t' | 'resize-b' | 'resize-l' | 'resize-r'
  | null;


export default function CropPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setPdfDataUri(null);
    setPdfDoc(null);
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
      return { canvasWidth: canvas.width, canvasHeight: canvas.height };
    } catch (e: any) {
      setError(`Failed to render page ${pageNumber}: ${e.message}`);
      return null;
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage).then((dims) => {
        if (dims && containerRef.current) {
            const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current;
            const { canvasWidth, canvasHeight } = dims;

            const canvasX = (containerWidth - canvasWidth) / 2;
            const canvasY = (containerHeight - canvasHeight) / 2;
            
            const newWidth = canvasWidth * 0.8;
            const newHeight = canvasHeight * 0.8;
            const newX = canvasX + (canvasWidth - newWidth) / 2;
            const newY = canvasY + (canvasHeight - newHeight) / 2;
            
             setCropBox({
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight,
            });
        }
      });
    }
  }, [pdfDoc, currentPage]);

  const getRelativeCoords = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
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
    if (!interaction || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const currentPos = getRelativeCoords(e);
    const { clientWidth: cWidth, clientHeight: cHeight } = containerRef.current;
    
    const dx = currentPos.x - startPos.x;
    const dy = currentPos.y - startPos.y;

    let { x: newX, y: newY, width: newWidth, height: newHeight } = startCropBox;

    switch (interaction) {
        case 'move':
            newX += dx;
            newY += dy;
            break;
        case 'resize-br':
            newWidth += dx;
            newHeight += dy;
            break;
        case 'resize-bl':
            newX += dx;
            newWidth -= dx;
            newHeight += dy;
            break;
        case 'resize-tr':
            newY += dy;
            newWidth += dx;
            newHeight -= dy;
            break;
        case 'resize-tl':
            newX += dx;
            newY += dy;
            newWidth -= dx;
            newHeight -= dy;
            break;
        case 'resize-t':
            newY += dy;
            newHeight -= dy;
            break;
        case 'resize-b':
            newHeight += dy;
            break;
        case 'resize-l':
            newX += dx;
            newWidth -= dx;
            break;
        case 'resize-r':
            newWidth += dx;
            break;
    }
    
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);

    newX = Math.max(0, Math.min(newX, cWidth - newWidth));
    newY = Math.max(0, Math.min(newY, cHeight - newHeight));
    
    newWidth = Math.min(newWidth, cWidth - newX);
    newHeight = Math.min(newHeight, cHeight - newY);

    setCropBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const endInteraction = () => {
    setInteraction(null);
  };
  
  const handleCrop = async () => {
    if (!pdfDataUri || !containerRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await cropPdfAction({
        pdfDataUri,
        cropArea: cropBox,
        applyTo: cropMode,
        currentPage: currentPage,
        clientContainerWidth: containerRef.current.clientWidth,
        clientContainerHeight: containerRef.current.clientHeight,
        clientCanvasWidth: canvasRef.current.width,
        clientCanvasHeight: canvasRef.current.height,
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
                  className="relative w-full h-[70vh] bg-muted/30 overflow-hidden touch-none select-none flex items-center justify-center"
                  onMouseMove={handleInteractionMove}
                  onMouseUp={endInteraction}
                  onMouseLeave={endInteraction}
                  onTouchMove={handleInteractionMove}
                  onTouchEnd={endInteraction}
                >
                  <canvas ref={canvasRef} />
                  <div
                    className="absolute border-2 border-dashed border-primary bg-primary/20 cursor-move"
                    style={{ 
                      left: `${cropBox.x}px`, 
                      top: `${cropBox.y}px`, 
                      width: `${cropBox.width}px`, 
                      height: `${cropBox.height}px` 
                    }}
                    onMouseDown={(e) => startInteraction(e, 'move')}
                    onTouchStart={(e) => startInteraction(e, 'move')}
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

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        {/* How to Use Section */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Use Our Free Online PDF Cropper</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3>
              <p className="text-muted-foreground">Click the upload button or drag and drop your file into the designated area. Your file is processed securely in your browser.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Select Your Crop Area</h3>
              <p className="text-muted-foreground">A preview of your PDF will appear. Click and drag on the page to draw a crop box. You can adjust the box by dragging its edges and corners.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Crop and Download</h3>
              <p className="text-muted-foreground">Choose to apply the crop to a single page or all pages, then click the "Crop PDF" button. Download your perfectly cropped PDF instantly.</p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <div className="text-center mb-12">
            <HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="mt-2 text-muted-foreground">Quick answers to common questions about our PDF cropping tool.</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg text-left">Is this PDF cropping tool free to use?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes, absolutely. Our online PDF cropper is completely free to use. There are no hidden fees, watermarks, or sign-up requirements. You can crop as many PDF files as you need.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Are my uploaded files secure?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                We prioritize your privacy and security. The entire cropping process happens in your browser, meaning your files are never uploaded to our servers. Your data remains private and secure on your own device.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Can I crop multiple pages of a PDF at once?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes, you can. After defining your crop area on a single page, you have the option to apply that same crop selection to all pages in the document. This is perfect for consistently removing headers, footers, or margins from an entire file.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg text-left">Will cropping a PDF reduce its quality?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                No, our tool is designed to maintain the highest possible quality. When you crop a PDF, we don't re-compress the content within your selected area. The text, images, and graphics will retain their original clarity and resolution.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Blog Post Section */}
        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">The Ultimate Guide to Cropping PDF Files</h2>
            <p>Cropping a PDF is a common task, but it can be surprisingly tricky without the right tool. Whether you need to remove unwanted margins, trim away unnecessary white space, or focus on a specific part of a page, a reliable PDF cropper is essential. Our free online tool makes this process simple, secure, and efficient.</p>
            
            <h3>Why Crop a PDF?</h3>
            <p>There are many reasons you might need to crop a PDF document. Here are a few common scenarios:</p>
            <ul>
              <li><strong>Removing White Margins:</strong> Many documents have large margins that are unnecessary for digital viewing or can waste space when printing. Cropping the PDF allows you to create a cleaner, more focused document that is easier to read on screens of all sizes.</li>
              <li><strong>Focusing on Specific Content:</strong> You might have a page with multiple charts, images, or blocks of text, but you only need to share or present one specific area. Our tool lets you crop a PDF to isolate that specific content, creating a new, targeted document.</li>
              <li><strong>Preparing for Presentations:</strong> When using a PDF in a presentation, cropping allows you to remove distracting elements like headers, footers, or page numbers, ensuring your audience focuses only on the important information.</li>
              <li><strong>Standardizing Document Sizes:</strong> If you're combining multiple PDFs from different sources, they may have different page sizes. Cropping can help you standardize the dimensions for a more professional and consistent final document.</li>
            </ul>

            <h3>Advantages of Using Our Online PDF Cropper</h3>
            <p>While some desktop software offers PDF cropping capabilities, using a free online tool like ours has several key advantages:</p>
            <ul>
              <li><strong>Accessibility:</strong> Access our tool from any device with a web browser. There's no software to install or update.</li>
              <li><strong>Security:</strong> Because the cropping process is handled client-side (in your browser), your files never leave your computer. This offers unparalleled privacy and security for your sensitive documents.</li>
              <li><strong>Ease of Use:</strong> Our visual interface is incredibly intuitive. Simply draw a box around the area you want to keep. It's that easy to crop a PDF online.</li>
              <li><strong>High-Quality Results:</strong> We ensure that the quality of your content is preserved. Your cropped PDF will maintain the original resolution and clarity of the text and images within the selected area.</li>
            </ul>
            <p>Whether you're a student, a professional, or just someone who needs to quickly edit a document, our tool provides a fast and reliable solution for all your PDF cropping needs. Try it today and see how easy it is to get the perfect crop every time.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
