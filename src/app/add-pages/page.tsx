
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
import { FilePlus2, Loader2, Info, Plus, ArrowDownAZ, X, GripVertical, Combine, Download, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { assemblePdfAction } from '@/app/add-pages/actions';
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
}

interface DisplayItem {
  type: 'pdf_page' | 'add_button';
  id: string;
  data?: SelectedPdfPageItem;
  originalItemIndex?: number; 
  insertAtIndex?: number;
}

const PREVIEW_TARGET_HEIGHT_ASSEMBLE = 180;

export default function AddPagesPage() {
  const [selectedPdfItems, setSelectedPdfItems] = useState<SelectedPdfPageItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [assembledPdfUri, setAssembledPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertAtIndexRef = useRef<number | null>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  const resetState = () => {
    setSelectedPdfItems([]);
    setAssembledPdfUri(null);
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
          });
        }
      } catch (e: any) {
        console.error("Error processing file into pages:", file.name, e);
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
    const filesToProcess = newFilesFromInput.slice(0, 1); 
    const processedNewPageItems = await processFiles(filesToProcess);

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
    const filesToProcess = newFilesFromInput.slice(0, 1); 
    const processedNewPageItems = await processFiles(filesToProcess);
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

  const handleAssemble = async () => {
    if (selectedPdfItems.length < 1) {
      toast({
        title: "No pages selected",
        description: "Please upload a PDF and ensure pages are present to assemble.",
        variant: "destructive",
      });
      return;
    }

    setIsAssembling(true);
    setError(null);

    try {
      const pagesToAssemble = selectedPdfItems.map(item => ({
        sourcePdfDataUri: item.originalFileDataUri,
        pageIndexToCopy: item.pageIndexInOriginalFile,
      }));

      const result = await assemblePdfAction({ orderedPagesToAssemble: pagesToAssemble });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Assembly Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.assembledPdfDataUri) {
        setAssembledPdfUri(result.assembledPdfDataUri);
        setShowConfetti(true);
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during assembly.";
      setError(errorMessage);
      toast({ title: "Assembly Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAssembling(false);
    }
  };

  const handleDownload = () => {
    if (assembledPdfUri) {
        downloadDataUri(assembledPdfUri, "added_pages_document.pdf");
    }
  };

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
    displayItems.push({ type: 'add_button', id: 'add-slot-0', insertAtIndex: 0 });

    selectedPdfItems.forEach((pageItem, index) => {
      displayItems.push({ type: 'pdf_page', id: pageItem.id, data: pageItem, originalItemIndex: index });
      displayItems.push({ type: 'add_button', id: `add-slot-${index + 1}`, insertAtIndex: index + 1 });
    });
  }

  return (
    <div className="max-w-full mx-auto space-y-8">
      <PageConfetti active={showConfetti} />
      <header className="text-center py-8">
        <FilePlus2 className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Add Pages to PDF</h1>
        <p className="text-muted-foreground mt-2">
          Upload a PDF. Each page will become a draggable card. Reorder and assemble them into a new document.
        </p>
      </header>

      {selectedPdfItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>Select or drag a PDF file. Its pages will be displayed individually.</CardDescription>
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
                        <div className="relative w-full mb-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(pageItem.id)}
                            className="absolute top-1 right-1 z-10 h-7 w-7 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                            aria-label="Remove page"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="flex justify-center items-center w-full h-auto" style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_ASSEMBLE + 20}px`}}>
                            <PdfPagePreview
                                pdfDataUri={pageItem.originalFileDataUri}
                                pageIndex={pageItem.pageIndexInOriginalFile}
                                targetHeight={PREVIEW_TARGET_HEIGHT_ASSEMBLE}
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
                <CardTitle>Assembly Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="default" className="text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Drag and drop page cards to reorder them. The final PDF will be assembled based on this order.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleSortByName} variant="outline" className="w-full" disabled={selectedPdfItems.length < 2}>
                  <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort Pages
                </Button>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                {assembledPdfUri ? (
                    <>
                        <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg">
                            <Download className="mr-2 h-5 w-5"/> Download Assembled PDF
                        </Button>
                        <Button onClick={resetState} className="w-full" variant="outline">
                            Process Another File
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={handleAssemble}
                        disabled={selectedPdfItems.length < 1 || isAssembling || isLoadingPreviews}
                        className="w-full"
                        size="lg"
                    >
                    {isAssembling ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Combine className="mr-2 h-4 w-4" />
                    )}
                    Assemble Pages ({selectedPdfItems.length})
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
          <h2 className="text-3xl font-bold text-center mb-8">How to Add Pages to a PDF</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDFs</h3>
              <p className="text-muted-foreground">Begin by uploading your primary PDF. You can then use the '+' buttons to upload additional PDFs from which you want to add pages.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Arrange and Reorder</h3>
              <p className="text-muted-foreground">All pages from your uploaded files will appear as individual cards. Simply drag and drop the page cards to arrange them in your desired final order.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Assemble and Download</h3>
              <p className="text-muted-foreground">Once you are happy with the page order, click the "Assemble Pages" button. Your new, combined PDF will be ready for instant download.</p>
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
              <AccordionTrigger className="text-lg text-left">Can I add pages from a different PDF file?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes. Our tool is designed for this purpose. You can upload an initial PDF, and then use the '+' buttons that appear between the pages to upload another PDF. All pages from the second document will be added to your workspace, allowing you to integrate them into your first document.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Will the quality of my PDF be affected?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                No, the quality and formatting of your original pages are preserved. When you add pages to a PDF using our tool, we copy the pages exactly as they are, without re-compressing or altering their content, ensuring the final document remains crisp and clear.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">How many pages or files can I add?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                You can upload multiple PDF files and arrange a large number of pages. While there is a generous limit, for extremely large documents (hundreds of pages), processing may take slightly longer. The tool is optimized for typical business and personal document sizes.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">Master Your Documents by Inserting Pages into PDFs</h2>
            <p>The need to add a page to a PDF is a common challenge. Whether you've forgotten a crucial slide in a presentation, need to include an updated appendix in a report, or want to combine related documents, our online "Add Pages to PDF" tool provides a seamless solution. It empowers you to insert pages into a PDF file with precision and ease, transforming a static document into a flexible and dynamic one.</p>
            
            <h3>Common Scenarios for Adding PDF Pages</h3>
            <ul>
              <li><strong>Updating Reports:</strong> Easily insert a new cover page, add a table of contents, or append new data sheets to an existing business report without starting from scratch.</li>
              <li><strong>Combining Invoices:</strong> Merge multiple invoices or receipts related to a single project into one consolidated PDF for easy record-keeping and submission.</li>
              <li><strong>Completing Forms:</strong> If you need to add a signature page or supplementary documents to a PDF form, our tool allows you to place them exactly where they need to go.</li>
              <li><strong>Building Portfolios:</strong> Graphic designers and artists can quickly add new project pages to their digital portfolios, keeping their work up-to-date.</li>
            </ul>

            <h3>The Advantage of a Visual Page Organizer</h3>
            <p>Unlike other tools that simply append files, our platform provides a visual workspace. When you upload a PDF, every page is displayed as a thumbnail. This allows you to:</p>
            <ul>
              <li><strong>Drag and Drop with Precision:</strong> See the exact order of your pages and rearrange them intuitively.</li>
              <li><strong>Insert Pages Anywhere:</strong> Use the '+' icons to add new PDF files at any point in your document—at the beginning, end, or in between any two existing pages.</li>
              <li><strong>Create a Cohesive Final Document:</strong> By visualizing the entire document flow, you can ensure the final assembled PDF is logical, professional, and perfectly organized.</li>
            </ul>
            <p>Our free and secure tool simplifies the process of adding pages to a PDF. By breaking down documents into individual pages and providing a flexible canvas, we give you complete control over your final file. Stop struggling with complicated software and start organizing your PDFs the easy way.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
