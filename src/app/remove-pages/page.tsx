
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
import { FileMinus2, Loader2, Info, Plus, ArrowDownAZ, X, GripVertical, Download, Trash2, Undo2, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { getInitialPageDataAction } from '@/app/remove-pages/actions';
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
  isMarkedForDeletion: boolean;
}

interface DisplayItem {
  type: 'pdf_page' | 'add_button';
  id: string;
  data?: SelectedPdfPageItem;
  originalItemIndex?: number;
  insertAtIndex?: number;
}

const PREVIEW_TARGET_HEIGHT_REMOVE = 160;

export default function RemovePagesPage() {
  const [selectedPdfItems, setSelectedPdfItems] = useState<SelectedPdfPageItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertAtIndexRef = useRef<number | null>(null);
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
            isMarkedForDeletion: false,
          });
        }
      } catch (e: any) {
        console.error("Error processing file into pages for removal:", file.name, e);
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
    const processedNewPageItems = await processFiles(newFilesFromInput);

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
    const processedNewPageItems = await processFiles(newFilesFromInput);
    setSelectedPdfItems(processedNewPageItems);
  };

  const handleRemoveCard = (idToRemove: string) => {
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
    toast({ description: "Pages sorted by name." });
  };

  const handleTogglePageDeletion = (pageId: string) => {
    setSelectedPdfItems(prevItems =>
      prevItems.map(item =>
        item.id === pageId ? { ...item, isMarkedForDeletion: !item.isMarkedForDeletion } : item
      )
    );
  };

  const handleProcessAndDownload = async () => {
    const pagesToKeep = selectedPdfItems.filter(item => !item.isMarkedForDeletion);

    if (pagesToKeep.length < 1 && selectedPdfItems.length > 0) {
      toast({
        title: "No Pages to Keep",
        description: "All pages are marked for deletion. Please unmark at least one page to proceed.",
        variant: "destructive",
      });
      return;
    }
     if (selectedPdfItems.length === 0) {
      toast({
        title: "No Pages Loaded",
        description: "Please upload PDF files first.",
        variant: "destructive",
      });
      return;
    }


    setIsProcessing(true);
    setError(null);

    try {
      const pagesToAssemble = pagesToKeep.map(item => ({
        sourcePdfDataUri: item.originalFileDataUri,
        pageIndexToCopy: item.pageIndexInOriginalFile,
        rotation: item.rotation, // Pass rotation even if not actively changed by UI
      }));

      const result = await assembleIndividualPagesAction({ orderedPagesToAssemble: pagesToAssemble });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Processing Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.organizedPdfDataUri) {
        setProcessedUri(result.organizedPdfDataUri);
        setShowConfetti(true);
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during processing.";
      setError(errorMessage);
      toast({ title: "Processing Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (processedUri) {
        downloadDataUri(processedUri, "removed_pages_document.pdf");
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
  const handleDragOver = (e: DragEvent<HTMLDivElement | HTMLButtonElement>) => { e.preventDefault(); };

  const displayItems: DisplayItem[] = [];
  if (selectedPdfItems.length > 0 || isLoadingPreviews) {
    selectedPdfItems.forEach((pageItem, index) => {
      displayItems.push({ type: 'pdf_page', id: pageItem.id, data: pageItem, originalItemIndex: index });
      displayItems.push({ type: 'add_button', id: `add-slot-${index + 1}`, insertAtIndex: index + 1 });
    });
  }
  
  const keptPagesCount = selectedPdfItems.filter(item => !item.isMarkedForDeletion).length;

  return (
    <div className="max-w-full mx-auto space-y-8">
      <PageConfetti active={showConfetti} />
      <header className="text-center py-8">
        <FileMinus2 className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Remove PDF Pages</h1>
        <p className="text-muted-foreground mt-2">
          Upload PDFs. Mark pages for deletion, reorder, and then download the modified document.
        </p>
      </header>

      {selectedPdfItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDFs</CardTitle>
            <CardDescription>Select or drag PDF files. Pages will be displayed for management. (Max 5 files)</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleInitialFilesSelected} multiple={true} accept="application/pdf" maxFiles={5} />
          </CardContent>
        </Card>
      )}

      <input
          type="file"
          ref={fileInputRef}
          onChange={handleHiddenInputChange}
          multiple={true}
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
                        draggable={!pageItem.isMarkedForDeletion}
                        onDragStart={() => handleDragStart(item.originalItemIndex!)}
                        onDragEnter={() => handleDragEnter(item.originalItemIndex!)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        className={cn(
                          "relative flex flex-col items-center p-3 shadow-md hover:shadow-lg transition-all bg-card h-full justify-between w-48",
                          pageItem.isMarkedForDeletion 
                            ? "ring-2 ring-destructive border-destructive"
                            : "cursor-grab active:cursor-grabbing"
                        )}
                      >
                        {pageItem.isMarkedForDeletion && (
                           <div className="absolute inset-0 bg-destructive/30 flex items-center justify-center z-10 pointer-events-none rounded-lg">
                                <span className="text-destructive-foreground font-semibold bg-destructive px-2 py-0.5 rounded text-xs">Marked for Deletion</span>
                           </div>
                        )}
                        <div className="relative w-full mb-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCard(pageItem.id)}
                            className="absolute top-0 right-0 z-20 h-7 w-7 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                            aria-label="Remove page from view"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="flex justify-center space-x-1 mb-1.5">
                             <Button 
                                variant={pageItem.isMarkedForDeletion ? "outline" : "destructive"} 
                                size="xs" 
                                onClick={() => handleTogglePageDeletion(pageItem.id)}
                                className={cn("w-full z-20", pageItem.isMarkedForDeletion && "border-green-500 hover:bg-green-100")}
                                title={pageItem.isMarkedForDeletion ? "Keep this page" : "Mark to delete this page"}
                              >
                                {pageItem.isMarkedForDeletion ? 
                                    <Undo2 className="h-3 w-3 mr-1 text-green-600" /> : 
                                    <Trash2 className="h-3 w-3 mr-1" />
                                }
                                {pageItem.isMarkedForDeletion ? "Keep" : "Delete"}
                              </Button>
                          </div>
                          <div className={cn("flex justify-center items-center w-full h-auto", pageItem.isMarkedForDeletion && "opacity-50")} style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_REMOVE + 20}px`}}>
                            <PdfPagePreview
                                pdfDataUri={pageItem.originalFileDataUri}
                                pageIndex={pageItem.pageIndexInOriginalFile}
                                rotation={pageItem.rotation}
                                targetHeight={PREVIEW_TARGET_HEIGHT_REMOVE}
                                className="border rounded"
                            />
                          </div>
                        </div>
                        <p className={cn("text-xs text-center truncate w-full px-1 text-muted-foreground", pageItem.isMarkedForDeletion && "opacity-50")} title={pageItem.displayName}>
                          {pageItem.displayName}
                        </p>
                        {!pageItem.isMarkedForDeletion && <GripVertical className="h-5 w-5 text-muted-foreground/50 mt-1" aria-hidden="true" />}
                      </Card>
                    );
                  } else if (item.type === 'add_button') {
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
              <CardHeader className="text-center">
                <CardTitle>Page Removal Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="default" className="text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Mark pages for deletion using the <Trash2 className="inline h-3 w-3" /> icon. Reorder and add more pages as needed.
                    Kept pages: <span className="font-semibold text-green-600">{keptPagesCount}</span>.
                    Marked: <span className="font-semibold text-destructive">{selectedPdfItems.length - keptPagesCount}</span>.
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
                            <Download className="mr-2 h-5 w-5"/> Download Processed PDF
                        </Button>
                        <Button onClick={resetState} className="w-full" variant="outline">
                            Process Another PDF
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={handleProcessAndDownload}
                        disabled={selectedPdfItems.length < 1 || (selectedPdfItems.length > 0 && keptPagesCount < 1) || isProcessing || isLoadingPreviews}
                        className="w-full"
                        size="lg"
                    >
                        {isProcessing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        Apply & Download ({keptPagesCount} pages)
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
          <h2 className="text-3xl font-bold text-center mb-8">How to Remove Pages from a PDF</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3>
              <p className="text-muted-foreground">Click the upload area to select your PDF file. All pages from your document will be displayed as individual thumbnails.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Mark Pages to Remove</h3>
              <p className="text-muted-foreground">Hover over any page and click the "Delete" button to mark it for removal. You can unmark it by clicking "Keep".</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Apply & Download</h3>
              <p className="text-muted-foreground">Once you've marked all unwanted pages, click the "Apply & Download" button. A new PDF without the deleted pages will be created.</p>
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
              <AccordionTrigger className="text-lg text-left">Is it possible to undo the removal of a page?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes. Before you apply the changes, any page marked for deletion can be restored. Simply click the "Keep" button that appears on the marked page, and it will be included in the final document.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Can I remove pages from multiple PDF files at once?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes. You can upload multiple PDF files using the '+' buttons. All pages from all documents will be displayed in the workspace, allowing you to remove and reorder pages from various sources before creating a single, consolidated output file.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Does deleting pages affect the quality of the remaining pages?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                No, the quality of the pages you choose to keep is not affected at all. Our tool simply removes the unwanted pages and creates a new PDF with the remaining ones, preserving their original quality and formatting.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">Streamline Your Documents by Deleting PDF Pages</h2>
            <p>PDF documents are often final versions, but that doesn't mean they can't be modified. A common need is to remove specific pages—whether it's an unnecessary cover page, a blank page, an outdated appendix, or sensitive information that shouldn't be shared. Our free online tool to "remove pages from PDF" gives you the power to do just that with a simple, visual interface.</p>
            <h3>Why You Might Need to Delete PDF Pages</h3>
            <ul>
              <li><strong>Creating Excerpts:</strong> Easily create a shorter version of a long report or e-book by deleting irrelevant sections, making it easier to share key information.</li>
              <li><strong>Removing Sensitive Information:</strong> If certain pages of a contract or report contain confidential data, you can remove them before sending the document to external parties.</li>
              <li><strong>Cleaning Up Scans:</strong> Scanned documents often include blank pages or unwanted cover sheets. Our tool lets you quickly clean up your files for a more professional result.</li>
              <li><strong>Reducing File Size:</strong> Removing unnecessary, image-heavy pages can significantly reduce the overall file size of your PDF, making it easier to email or store.</li>
            </ul>
            <p>Our tool offers more than just deletion. You can see a clear thumbnail of every page, ensuring you know exactly which pages you are keeping and which you are removing. This visual approach prevents mistakes and gives you complete confidence in the final output. Stop sending bulky or irrelevant documents and start sharing perfectly tailored PDFs today.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
