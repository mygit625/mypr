
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
import { LayoutGrid, Loader2, Info, Plus, ArrowDownAZ, X, GripVertical, Combine, RotateCcw, RotateCw, Download, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { assembleIndividualPagesAction } from '@/app/organize/actions';
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

interface DisplayItem {
  type: 'pdf_page' | 'add_button';
  id: string;
  data?: SelectedPdfPageItem;
  originalItemIndex?: number;
  insertAtIndex?: number;
}

const PREVIEW_TARGET_HEIGHT_ORGANIZE = 180;

export default function OrganizePage() {
  const [selectedPdfItems, setSelectedPdfItems] = useState<SelectedPdfPageItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizedPdfUri, setOrganizedPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertAtIndexRef = useRef<number | null>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  const resetState = () => {
      setSelectedPdfItems([]);
      setOrganizedPdfUri(null);
      setError(null);
      setShowConfetti(false);
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  useEffect(() => {
    setError(null);
  }, [selectedPdfItems]);

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
        console.error("Error processing file into pages for organization:", file.name, e);
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
    const fileToProcess = newFilesFromInput.length > 0 ? [newFilesFromInput[0]] : [];
    if (fileToProcess.length === 0) return;

    const processedNewPageItems = await processFiles(fileToProcess);

    setSelectedPdfItems((prevItems) => {
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
    const fileToProcess = newFilesFromInput.length > 0 ? [newFilesFromInput[0]] : [];
     if (fileToProcess.length === 0) return;

    const processedNewPageItems = await processFiles(fileToProcess);
    setSelectedPdfItems(processedNewPageItems);
  };

  const handleRemoveFile = (idToRemove: string) => {
    setSelectedPdfItems((prevItems) => prevItems.filter(item => item.id !== idToRemove));
  };

  const handleAddFilesTrigger = (index: number) => {
    insertAtIndexRef.current = index;
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
    toast({ description: "Pages sorted by name (original file, then page number)." });
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

  const handleOrganize = async () => {
    if (selectedPdfItems.length < 1) {
      toast({
        title: "No pages selected",
        description: "Please upload a PDF and ensure pages are present to organize.",
        variant: "destructive",
      });
      return;
    }

    setIsOrganizing(true);
    setError(null);

    try {
      const pagesToAssemble = selectedPdfItems.map(item => ({
        sourcePdfDataUri: item.originalFileDataUri,
        pageIndexToCopy: item.pageIndexInOriginalFile,
        rotation: item.rotation,
      }));

      const result = await assembleIndividualPagesAction({ orderedPagesToAssemble: pagesToAssemble });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Organization Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.organizedPdfDataUri) {
        setOrganizedPdfUri(result.organizedPdfDataUri);
        setShowConfetti(true);
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during organization.";
      setError(errorMessage);
      toast({ title: "Organization Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsOrganizing(false);
    }
  };
  
  const handleDownload = () => {
      if (organizedPdfUri) {
          downloadDataUri(organizedPdfUri, "organized_document.pdf");
      }
  }

  const handleDragStart = (index: number) => {
    dragItemIndex.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItemIndex.current = index;
  };

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

  const handleDragOver = (e: DragEvent<HTMLDivElement | HTMLButtonElement>) => {
    e.preventDefault();
  };

  const displayItems: DisplayItem[] = [];
  if (selectedPdfItems.length > 0 || isLoadingPreviews) {
    selectedPdfItems.forEach((pageItem, index) => {
      displayItems.push({ type: 'pdf_page', id: pageItem.id, data: pageItem, originalItemIndex: index });
      displayItems.push({ type: 'add_button', id: `add-slot-${index + 1}`, insertAtIndex: index + 1 });
    });
  }

  return (
    <div className="max-w-full mx-auto space-y-8">
      <PageConfetti active={showConfetti} />
      <header className="text-center py-8">
        <LayoutGrid className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Organize PDF Pages</h1>
        <p className="text-muted-foreground mt-2">
          Upload a PDF. Drag and drop its pages to reorder, then assemble them into a new document.
        </p>
      </header>

      {selectedPdfItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>Select or drag a PDF file. Its pages will be displayed individually for organization.</CardDescription>
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
          multiple={false}
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
              <div className="flex flex-wrap items-center gap-px p-1">
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
                        className="flex flex-col items-center p-3 shadow-md hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing bg-card h-full justify-between w-44"
                      >
                        <div className="relative w-full mb-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(pageItem.id)}
                            className="absolute top-0 right-0 z-10 h-7 w-7 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                            aria-label="Remove page"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="flex justify-center space-x-1 mb-1">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleRotatePage(pageItem.id, 'ccw')}
                              aria-label="Rotate Left"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleRotatePage(pageItem.id, 'cw')}
                              aria-label="Rotate Right"
                            >
                              <RotateCw className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex justify-center items-center w-full h-auto" style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_ORGANIZE + 20}px`}}>
                            <PdfPagePreview
                                pdfDataUri={pageItem.originalFileDataUri}
                                pageIndex={pageItem.pageIndexInOriginalFile}
                                rotation={pageItem.rotation}
                                targetHeight={PREVIEW_TARGET_HEIGHT_ORGANIZE}
                                className="border rounded"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-center truncate w-full px-1 text-muted-foreground" title={pageItem.displayName}>
                          {pageItem.displayName}
                        </p>
                        <GripVertical className="h-5 w-5 text-muted-foreground/50 mt-1" aria-hidden="true" />
                      </Card>
                    );
                  } else if (item.type === 'add_button') {
                    return (
                      <div key={item.id} className="flex items-center justify-center h-full w-12">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (!isLoadingPreviews) handleAddFilesTrigger(item.insertAtIndex!);
                          }}
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
              <CardHeader className="text-center">
                <CardTitle>Organization Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="default" className="text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Drag and drop page cards to reorder them. Use rotate buttons on each page. The final PDF will be assembled based on this order and rotations.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleSortByName} variant="outline" className="w-full" disabled={selectedPdfItems.length < 2}>
                  <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort Pages
                </Button>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                {organizedPdfUri ? (
                    <>
                        <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg">
                            <Download className="mr-2 h-5 w-5"/> Download Organized PDF
                        </Button>
                        <Button onClick={resetState} className="w-full" variant="outline">
                            Organize Another PDF
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={handleOrganize}
                        disabled={selectedPdfItems.length < 1 || isOrganizing || isLoadingPreviews}
                        className="w-full"
                        size="lg"
                        >
                        {isOrganizing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Combine className="mr-2 h-4 w-4" />
                        )}
                        Organize & Save ({selectedPdfItems.length})
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
          <h2 className="text-3xl font-bold text-center mb-8">How to Organize a PDF</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF(s)</h3>
              <p className="text-muted-foreground">Select one or more PDF files. All pages will appear as individual thumbnails, ready for you to manage.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Reorder, Rotate & Delete</h3>
              <p className="text-muted-foreground">Simply drag and drop the page thumbnails to change their order. Use the buttons on each page to rotate or remove them.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Create and Download</h3>
              <p className="text-muted-foreground">Once you are happy with the arrangement, click the "Organize & Save" button to create your new PDF file.</p>
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
              <AccordionTrigger className="text-lg text-left">Can I add pages from a different PDF?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes. Our tool is designed for flexibility. After uploading your first PDF, you can use the '+' buttons that appear between the pages to upload another PDF. All pages from the new document will be added to your workspace, allowing you to integrate and reorder them with the existing pages.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">How do I remove a page I don't want?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Each page thumbnail has a small 'X' icon in the top right corner. Simply click this icon to remove any unwanted page from your document before saving the final version.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Will organizing the pages affect the PDF quality?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                No. Reordering, rotating, and deleting pages are lossless operations. The quality and formatting of your original pages are perfectly preserved in the final, organized PDF document.
              </A