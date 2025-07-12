
"use client";

// Polyfill for Promise.withResolvers if needed by pdfjs-dist client-side
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

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import JSZip from 'jszip';

import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { FileImage, Loader2, Info, Plus, ArrowDownAZ, X, GripVertical, Download, RotateCcw, RotateCw, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { cn } from '@/lib/utils';

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

interface DisplayItem {
  type: 'pdf_page' | 'add_button';
  id: string;
  data?: SelectedPdfPageItem;
  originalItemIndex?: number;
  insertAtIndex?: number;
}

const PREVIEW_TARGET_HEIGHT_PDF_TO_JPG = 180;

export default function PdfToJpgPage() {
  const [selectedPdfItems, setSelectedPdfItems] = useState<SelectedPdfPageItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Used for both single and ZIP conversion
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertAtIndexRef = useRef<number | null>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  const [jpgQuality, setJpgQuality] = useState(0.9);
  const [imageScale, setImageScale] = useState(1.5);

  useEffect(() => {
    setError(null);
  }, [selectedPdfItems]);

  const convertPageToJpg = async (
    pdfDataUri: string,
    pageIndex: number,
    rotation: number,
    quality: number,
    scale: number
  ): Promise<string> => {
    const base64Marker = ';base64,';
    const base64Index = pdfDataUri.indexOf(base64Marker);
    if (base64Index === -1) throw new Error('Invalid PDF data URI format.');
    const pdfBase64Data = pdfDataUri.substring(base64Index + base64Marker.length);
    const pdfBinaryData = atob(pdfBase64Data);
    const pdfDataArray = new Uint8Array(pdfBinaryData.length);
    for (let i = 0; i < pdfBinaryData.length; i++) {
      pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
    }

    const pdfDoc: PDFDocumentProxy = await pdfjsLib.getDocument({ data: pdfDataArray }).promise;
    if (pageIndex < 0 || pageIndex >= pdfDoc.numPages) {
        throw new Error(`Page index ${pageIndex} out of bounds.`);
    }
    const page: PDFPageProxy = await pdfDoc.getPage(pageIndex + 1);
    
    const totalRotationForViewport = (page.rotate + rotation + 360) % 360;
    const viewport = page.getViewport({ scale: scale, rotation: totalRotationForViewport });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context for page.');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext: RenderParameters = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext).promise;
    page.cleanup();
    if (typeof (pdfDoc as any).destroy === 'function') {
      await (pdfDoc as any).destroy();
    }
    return canvas.toDataURL('image/jpeg', quality);
  };

  const handleDownloadSingleJpg = async (pageItem: SelectedPdfPageItem) => {
    setIsProcessing(true);
    setError(null);
    try {
      const jpgDataUrl = await convertPageToJpg(
        pageItem.originalFileDataUri,
        pageItem.pageIndexInOriginalFile,
        pageItem.rotation,
        jpgQuality,
        imageScale
      );
      downloadDataUri(jpgDataUrl, `${pageItem.originalFileName}_page_${pageItem.pageIndexInOriginalFile + 1}.jpg`);
      toast({ title: "JPG Downloaded", description: `Page ${pageItem.pageIndexInOriginalFile + 1} converted and download started.` });
    } catch (e: any) {
      const errorMessage = e.message || "Failed to convert page to JPG.";
      setError(errorMessage);
      toast({ title: "Conversion Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAllAsZip = async () => {
    if (selectedPdfItems.length === 0) {
      toast({ title: "No Pages", description: "Please upload a PDF and ensure pages are loaded.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    setError(null);
    const zip = new JSZip();
    let filesInZip = 0;

    try {
      for (const pageItem of selectedPdfItems) {
        try {
            const jpgDataUrl = await convertPageToJpg(
            pageItem.originalFileDataUri,
            pageItem.pageIndexInOriginalFile,
            pageItem.rotation,
            jpgQuality,
            imageScale
            );
            const jpgBase64 = jpgDataUrl.split(',')[1];
            zip.file(`${pageItem.originalFileName}_page_${pageItem.pageIndexInOriginalFile + 1}.jpg`, jpgBase64, { base64: true });
            filesInZip++;
        } catch (pageError: any) {
            console.error(`Failed to convert page ${pageItem.displayName}: ${pageError.message}`);
            toast({
                title: "Page Conversion Skipped",
                description: `Could not convert ${pageItem.displayName}. ${pageError.message}`,
                variant: "destructive",
                duration: 5000,
            });
        }
      }
      
      if (filesInZip === 0 && selectedPdfItems.length > 0) {
        throw new Error("No pages could be converted to JPG. Please check individual page errors.");
      }
      if (filesInZip === 0) {
         toast({ title: "No images to zip", description: "No pages were successfully converted to add to the ZIP.", variant: "destructive" });
         setIsProcessing(false);
         return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipReader = new FileReader();
      zipReader.onload = function(event) {
        if (event.target && typeof event.target.result === 'string') {
          downloadDataUri(event.target.result, `${selectedPdfItems[0].originalFileName}_pages.zip`);
          toast({ title: "Conversion Successful!", description: `${filesInZip} JPG images zipped and download started.` });
        } else {
            throw new Error("Failed to read ZIP blob as Data URI.");
        }
      };
      zipReader.onerror = function() {
        throw new Error("Error reading ZIP blob.");
      }
      zipReader.readAsDataURL(zipBlob);

    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during ZIP creation.";
      setError(errorMessage);
      toast({ title: "ZIP Creation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
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
            originalFileName: file.name.replace(/\.pdf$/i, ''), // Remove .pdf extension for consistent naming
            originalFileDataUri: dataUri,
            pageIndexInOriginalFile: i,
            totalPagesInOriginalFile: numPages,
            displayName: `${file.name} (Page ${i + 1} of ${numPages})`,
            rotation: 0,
          });
        }
         if (typeof (pdfDoc as any).destroy === 'function') {
            await (pdfDoc as any).destroy();
        }
      } catch (e: any)
      {
        console.error("Error processing file into pages for PDF to JPG:", file.name, e);
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

  const handleFilesSelected = async (newFilesFromInput: File[], insertAt: number | null) => {
    if (newFilesFromInput.length === 0) return;
    // For PDF to JPG, typically operate on one PDF at a time to explode its pages
    const fileToProcess = newFilesFromInput.length > 0 ? [newFilesFromInput[0]] : [];
     if (fileToProcess.length === 0) return;

    const processedNewPageItems = await processFiles(fileToProcess);

    setSelectedPdfItems((prevItems) => {
      // If we want to replace existing pages when a new PDF is added (common for this tool type)
      if (insertAt === null || prevItems.length === 0) {
        return processedNewPageItems;
      }
      // If we allow adding pages from other PDFs (like organize)
      const updatedItems = [...prevItems];
      if (insertAt !== null && insertAt >= 0 && insertAt <= updatedItems.length) {
        updatedItems.splice(insertAt, 0, ...processedNewPageItems);
      } else {
        updatedItems.push(...processedNewPageItems);
      }
      return updatedItems;
    });
    insertAtIndexRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInitialFilesSelected = async (newFilesFromInput: File[]) => {
    if (newFilesFromInput.length === 0) {
      setSelectedPdfItems([]);
      return;
    }
    // "PDF to JPG" usually focuses on one PDF at a time. Explode its pages.
    const fileToProcess = newFilesFromInput.length > 0 ? [newFilesFromInput[0]] : [];
    if (fileToProcess.length === 0) return;
    
    const processedNewPageItems = await processFiles(fileToProcess);
    setSelectedPdfItems(processedNewPageItems); // Replace current items
  };

  const handleRemovePageCard = (idToRemove: string) => {
    setSelectedPdfItems((prevItems) => prevItems.filter(item => item.id !== idToRemove));
  };

  const handleAddFilesTrigger = (index: number) => {
    insertAtIndexRef.current = index; // Store where to insert new pages
    fileInputRef.current?.click();
  };

  const handleHiddenInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFilesSelected(Array.from(event.target.files), insertAtIndexRef.current);
    }
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
  const handleDragOver = (e: DragEvent<HTMLDivElement | HTMLButtonElement>) => { e.preventDefault(); };

  const displayItems: DisplayItem[] = [];
  if (selectedPdfItems.length > 0 || isLoadingPreviews) {
    // No initial add button if we always replace pages on new upload for this tool
    selectedPdfItems.forEach((pageItem, index) => {
      displayItems.push({ type: 'pdf_page', id: pageItem.id, data: pageItem, originalItemIndex: index });
      // "Add files" button can be placed between items if desired for merging page lists from multiple PDFs
      // For a typical "PDF to JPG", this might be omitted if only one PDF's pages are handled at a time.
      // displayItems.push({ type: 'add_button', id: `add-slot-${index + 1}`, insertAtIndex: index + 1 });
    });
     if (selectedPdfItems.length > 0) { // Add button at the end if items exist
        displayItems.push({ type: 'add_button', id: `add-slot-${selectedPdfItems.length}`, insertAtIndex: selectedPdfItems.length });
    }
  }


  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <FileImage className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">PDF to JPG Converter</h1>
        <p className="text-muted-foreground mt-2">
          Upload a PDF. Convert individual pages or all pages to JPG images. Reorder and rotate before conversion.
        </p>
      </header>

      {selectedPdfItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>Select or drag a PDF file. Its pages will be displayed for conversion.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleInitialFilesSelected} multiple={false} accept="application/pdf" />
          </CardContent>
        </Card>
      )}

      <input
          type="file"
          ref={fileInputRef}
          onChange={handleHiddenInputChange}
          multiple={false} // Change to true if allowing adding pages from multiple PDFs
          accept="application/pdf"
          className="hidden"
      />

      {isLoadingPreviews && selectedPdfItems.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Processing PDF pages...</p>
        </div>
      )}

      {(selectedPdfItems.length > 0 || (isLoadingPreviews && selectedPdfItems.length > 0)) && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-grow lg:w-3/4">
            <ScrollArea className="h-[calc(100vh-280px)] p-1 border rounded-md bg-muted/10">
              <div className="flex flex-wrap items-start gap-3 p-2">
                {displayItems.map((item) => {
                  if (item.type === 'pdf_page' && item.data) {
                    const pageItem = item.data;
                    return (
                      <Card
                        key={pageItem.id}
                        draggable
                        onDragStart={() => handleDragStart(item.originalItemIndex!)}
                        onDragEnter={() => handleDragEnter(item.originalItemIndex!)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        className="flex flex-col items-center p-3 shadow-md hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing bg-card h-full justify-between w-52"
                      >
                        <div className="relative w-full mb-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePageCard(pageItem.id)}
                            className="absolute top-0 right-0 z-10 h-7 w-7 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                            aria-label="Remove page from view"
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
                          <div className="flex justify-center items-center w-full h-auto" style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_PDF_TO_JPG + 20}px`}}>
                            <PdfPagePreview
                                pdfDataUri={pageItem.originalFileDataUri}
                                pageIndex={pageItem.pageIndexInOriginalFile}
                                rotation={pageItem.rotation}
                                targetHeight={PREVIEW_TARGET_HEIGHT_PDF_TO_JPG}
                                className="border rounded"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-center truncate w-full px-1 text-muted-foreground" title={pageItem.displayName}>
                          {pageItem.displayName}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => handleDownloadSingleJpg(pageItem)}
                          disabled={isProcessing}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" /> Download JPG
                        </Button>
                        <GripVertical className="h-5 w-5 text-muted-foreground/50 mt-1.5" aria-hidden="true" />
                      </Card>
                    );
                  } else if (item.type === 'add_button') {
                    // This button allows adding pages from another PDF if `multiple` is true on fileInputRef
                    return (
                      <div key={item.id} className="flex items-center justify-center self-stretch h-auto w-12">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => { if (!isLoadingPreviews) handleAddFilesTrigger(item.insertAtIndex!); }}
                          disabled={isLoadingPreviews}
                          className="rounded-full h-10 w-10 shadow-sm hover:shadow-md hover:border-primary/80 hover:text-primary/80 transition-all"
                          aria-label={`Add PDF file at position ${item.insertAtIndex}`}
                        >
                          {isLoadingPreviews && insertAtIndexRef.current === item.insertAtIndex ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Plus className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })}
                 {isLoadingPreviews && selectedPdfItems.length > 0 && displayItems.length === 0 && (
                    <div className="col-span-full flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2 text-muted-foreground">Loading page previews...</p>
                    </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="lg:w-1/4 space-y-4 lg:sticky lg:top-24 self-start">
            <Card className="shadow-lg">
              <CardHeader className="text-center pb-3">
                <CardTitle className="text-xl font-semibold flex items-center justify-center"><Settings2 className="mr-2 h-5 w-5"/>Conversion Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label htmlFor="quality-slider" className="mb-1.5 block text-sm">JPG Quality: <span className="font-bold text-primary">{jpgQuality.toFixed(1)}</span></Label>
                  <Slider
                    id="quality-slider"
                    min={0.1} max={1} step={0.1} value={[jpgQuality]}
                    onValueChange={(value) => setJpgQuality(value[0])}
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <Label htmlFor="scale-slider" className="mb-1.5 block text-sm">Image Scale: <span className="font-bold text-primary">{imageScale.toFixed(1)}x</span></Label>
                  <Slider
                    id="scale-slider"
                    min={0.5} max={3} step={0.1} value={[imageScale]}
                    onValueChange={(value) => setImageScale(value[0])}
                    disabled={isProcessing}
                  />
                </div>
                 <Button onClick={handleSortByName} variant="outline" className="w-full" disabled={selectedPdfItems.length < 2 || isProcessing}>
                  <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort Pages
                </Button>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleDownloadAllAsZip}
                  disabled={selectedPdfItems.length < 1 || isProcessing || isLoadingPreviews}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download All as ZIP ({selectedPdfItems.length})
                </Button>
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
    </div>
  );
}

    