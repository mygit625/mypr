"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { RotateCcw, RotateCw, Loader2, Info, Plus, ArrowDownAZ, X, GripVertical, Download, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { assembleIndividualPagesAction } from '@/app/rotate/actions';
import { cn } from '@/lib/utils';
import { PageConfetti } from '@/components/ui/page-confetti';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface SelectedPdfPageItem {
  id: string;
  originalFileId: string;
  originalFileName: string;
  originalFileDataUri: string;
  pageIndexInOriginalFile: number;
  totalPagesInOriginalFile: number;
  displayName: string;
  rotation: number;
}

const PREVIEW_TARGET_HEIGHT_ROTATE = 180;

export default function RotatePdfPage() {
  const [selectedPdfItems, setSelectedPdfItems] = useState<SelectedPdfPageItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  const resetState = () => {
    setSelectedPdfItems([]);
    setProcessedUri(null);
    setError(null);
    setShowConfetti(false);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const processFiles = async (files: File[]): Promise<SelectedPdfPageItem[]> => {
    setIsLoadingPreviews(true);
    const newPageItems: SelectedPdfPageItem[] = [];

    for (const file of files) {
      const originalFileId = crypto.randomUUID();
      try {
        const dataUri = await readFileAsDataURL(file);
        const base64Marker = ';base64,';
        const base64Index = dataUri.indexOf(base64Marker);
        if (base64Index === -1) throw new Error('Invalid PDF data URI format.');
        const pdfBase64Data = dataUri.substring(base64Index + base64Marker.length);
        const pdfBinaryData = atob(pdfBase64Data);
        const pdfDataArray = new Uint8Array(pdfBinaryData.length);
        for (let i = 0; i < pdfBinaryData.length; i++) {
          pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
        }

        const pdfDoc: PDFDocumentProxy = await pdfjsLib.getDocument({ data: pdfDataArray }).promise;
        const numPages = pdfDoc.numPages;

        for (let i = 0; i < numPages; i++) {
          newPageItems.push({
            id: crypto.randomUUID(),
            originalFileId: originalFileId,
            originalFileName: file.name,
            originalFileDataUri: dataUri,
            pageIndexInOriginalFile: i,
            totalPagesInOriginalFile: numPages,
            displayName: `${file.name} (Page ${i + 1} of ${numPages})`,
            rotation: 0,
          });
        }
      } catch (e: any) {
        toast({
          title: "File Process Error",
          description: `Could not process file: ${file.name}. ${e.message}`,
          variant: "destructive",
        });
      }
    }
    setIsLoadingPreviews(false);
    return newPageItems;
  };
  
  const handleFilesSelected = async (newFilesFromInput: File[]) => {
    const processedNewPageItems = await processFiles(newFilesFromInput);
    setSelectedPdfItems((prevItems) => [...prevItems, ...processedNewPageItems]);
  };

  const handleInitialFilesSelected = async (newFilesFromInput: File[]) => {
    const processedNewPageItems = await processFiles(newFilesFromInput);
    setSelectedPdfItems(processedNewPageItems);
  };
  
  const handleHiddenInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFilesSelected(Array.from(event.target.files));
    }
  };

  const handleRemovePage = (idToRemove: string) => {
    setSelectedPdfItems((prevItems) => prevItems.filter(item => item.id !== idToRemove));
  };

  const handleSortByName = () => {
    setSelectedPdfItems((prevItems) =>
      [...prevItems].sort((a, b) => a.displayName.localeCompare(b.displayName))
    );
    toast({ description: "Pages sorted by name." });
  };
  
  const handleRotatePage = (pageId: string, direction: 'cw' | 'ccw') => {
    setSelectedPdfItems(prevItems =>
      prevItems.map(item => {
        if (item.id === pageId) {
          const newRotation = (item.rotation + (direction === 'cw' ? 90 : -90) + 360) % 360;
          return { ...item, rotation: newRotation };
        }
        return item;
      })
    );
  };
  
  const handleRotateAll = () => {
    setSelectedPdfItems(prevItems => 
        prevItems.map(item => ({
            ...item,
            rotation: (item.rotation + 90 + 360) % 360
        }))
    );
    toast({ description: "All pages rotated 90° clockwise." });
  };

  const handleApplyAndDownload = async () => {
    if (selectedPdfItems.length < 1) {
      toast({ title: "No pages to process", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const pagesToAssemble = selectedPdfItems.map(item => ({
        sourcePdfDataUri: item.originalFileDataUri,
        pageIndexToCopy: item.pageIndexInOriginalFile,
        rotation: item.rotation,
      }));

      const result = await assembleIndividualPagesAction({ orderedPagesToAssemble: pagesToAssemble });

      if (result.error) throw new Error(result.error);
      
      if (result.organizedPdfDataUri) {
        setProcessedUri(result.organizedPdfDataUri);
        setShowConfetti(true);
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (processedUri) {
        downloadDataUri(processedUri, "rotated_document.pdf");
    }
  };

  const handleDragStart = (index: number) => { dragItemIndex.current = index; };
  const handleDragEnter = (index: number) => { dragOverItemIndex.current = index; };
  const handleDragEnd = () => {
    if (dragItemIndex.current !== null && dragOverItemIndex.current !== null && dragItemIndex.current !== dragOverItemIndex.current) {
      const newItems = [...selectedPdfItems];
      const draggedItem = newItems.splice(dragItemIndex.current, 1)[0];
      newItems.splice(dragOverItemIndex.current, 0, draggedItem);
      setSelectedPdfItems(newItems);
    }
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();

  return (
    <div className="max-w-full mx-auto space-y-8">
      <PageConfetti active={showConfetti} />
      <header className="text-center py-8">
        <RotateCw className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Rotate PDF Pages</h1>
        <p className="text-muted-foreground mt-2">
          Rotate individual pages, reorder them, and download your newly organized PDF.
        </p>
      </header>

      {selectedPdfItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDFs</CardTitle>
            <CardDescription>Select or drag PDF files to begin.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleInitialFilesSelected} multiple={true} accept="application/pdf" />
          </CardContent>
        </Card>
      )}

      <input
          type="file"
          ref={fileInputRef}
          onChange={handleHiddenInputChange}
          multiple
          accept="application/pdf"
          className="hidden"
      />

      {isLoadingPreviews && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Processing PDF pages...</p>
        </div>
      )}

      {selectedPdfItems.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-grow lg:w-3/4">
             <div className="mb-4 text-center">
                 <Button onClick={handleRotateAll} variant="outline" disabled={isProcessing}>
                    <RotateCw className="mr-2 h-4 w-4"/> Rotate All Pages
                 </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-280px)] p-1 border rounded-md bg-muted/10">
              <div className="flex flex-wrap items-start gap-3 p-2">
                {selectedPdfItems.map((pageItem, index) => (
                  <Card
                    key={pageItem.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    className="flex flex-col items-center p-3 shadow-md hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing bg-card h-full justify-between w-48"
                  >
                    <div className="relative w-full mb-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePage(pageItem.id)}
                        className="absolute top-0 right-0 z-10 h-7 w-7 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                        aria-label="Remove page"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="flex justify-center space-x-1 mb-1.5">
                        <Button variant="outline" size="xs" onClick={() => handleRotatePage(pageItem.id, 'ccw')} aria-label="Rotate Left">
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="xs" onClick={() => handleRotatePage(pageItem.id, 'cw')} aria-label="Rotate Right">
                          <RotateCw className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex justify-center items-center w-full h-auto" style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_ROTATE + 20}px`}}>
                        <PdfPagePreview
                            pdfDataUri={pageItem.originalFileDataUri}
                            pageIndex={pageItem.pageIndexInOriginalFile}
                            rotation={pageItem.rotation}
                            targetHeight={PREVIEW_TARGET_HEIGHT_ROTATE}
                            className="border rounded"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-center truncate w-full px-1 text-muted-foreground" title={pageItem.displayName}>
                      {pageItem.displayName}
                    </p>
                    <GripVertical className="h-5 w-5 text-muted-foreground/50 mt-1" aria-hidden="true" />
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="lg:w-1/4 space-y-4 lg:sticky lg:top-24 self-start">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle>Rotation Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="default" className="text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Drag pages to reorder. Use rotation buttons on each page or the main button to rotate all.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleSortByName} variant="outline" className="w-full" disabled={selectedPdfItems.length < 2}>
                  <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort Pages
                </Button>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                {processedUri ? (
                    <>
                        <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg">
                            <Download className="mr-2 h-5 w-5"/> Download Rotated PDF
                        </Button>
                        <Button onClick={resetState} className="w-full" variant="outline">
                            Rotate Another PDF
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={handleApplyAndDownload}
                        disabled={isProcessing || isLoadingPreviews || selectedPdfItems.length === 0}
                        className="w-full"
                        size="lg"
                    >
                        {isProcessing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        Apply & Download
                    </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-6 max-w-xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Rotate PDF Pages</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF(s)</h3>
              <p className="text-muted-foreground">Select one or more PDF files. Each page will be displayed as a thumbnail, ready for you to manage.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Rotate and Reorder</h3>
              <p className="text-muted-foreground">Click the rotate buttons on any page to change its orientation. Drag and drop pages to reorder them as needed.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Apply and Download</h3>
              <p className="text-muted-foreground">Once your pages are correctly oriented and ordered, click "Apply & Download" to get your new PDF file.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="text-center mb-12">
            <HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg text-left">Can I rotate just one page in a multi-page PDF?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes, absolutely. Our tool displays each page of your document individually. You can click the rotate buttons on a specific page thumbnail to adjust its orientation without affecting any other pages in the document.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Is it possible to rotate all pages at once?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes. For convenience, we provide a "Rotate All Pages" button above the page previews. Clicking this will rotate every page in your document 90 degrees clockwise at the same time.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Will rotating a PDF affect its quality?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                No, rotating a PDF is a lossless operation. Our tool changes the orientation metadata for the pages without re-compressing or altering the quality of the text or images within your document.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
        
        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">Mastering PDF Orientation</h2>
            <p>Incorrect page orientation is a common annoyance when dealing with PDF documents. A scanned document might be sideways, or a table might be in landscape while the rest of the report is in portrait. Our free online PDF rotator provides a simple and powerful solution to fix these issues permanently.</p>
            <h3>Why You Need to Rotate PDF Files</h3>
            <ul>
              <li><strong>Correcting Scanned Documents:</strong> Scanners don't always get the orientation right. Our tool lets you quickly fix pages that are upside down or sideways.</li>
              <li><strong>Combining Portrait and Landscape:</strong> When merging documents, you might have pages with different orientations. Our rotator lets you adjust each page individually for a consistent final document.</li>
              <li><strong>Improving Readability:</strong> A document with the correct orientation is easier to read on any screen, eliminating the need for viewers to manually rotate the view each time.</li>
            </ul>
            <p>Unlike simple viewers that only temporarily change the view, our tool permanently saves the rotation changes to the file itself. This means that when you share the new PDF, it will open in the correct orientation for everyone, on any device. With the ability to handle multiple files, reorder pages, and rotate individual pages or the entire document at once, you have complete control over your final output.</p>
          </div>
        </section>
      </div>
    </div>
  );
}