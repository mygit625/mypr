
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
import { RotateCcw, RotateCw, Loader2, Info, Plus, ArrowDownAZ, X, GripVertical, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { assembleIndividualPagesAction } from '../organize/actions'; // Use action from organize
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

const PREVIEW_TARGET_HEIGHT_ROTATE = 180;

export default function RotatePdfPage() {
  const [selectedPdfItems, setSelectedPdfItems] = useState<SelectedPdfPageItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Renamed from isOrganizing
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertAtIndexRef = useRef<number | null>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

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
          const page = await pdfDoc.getPage(i + 1); // Get page to read initial rotation
          newPageItems.push({
            id: crypto.randomUUID(),
            originalFileId: originalFileId,
            originalFileName: file.name,
            originalFileDataUri: dataUri,
            pageIndexInOriginalFile: i,
            totalPagesInOriginalFile: numPages,
            displayName: `${file.name} (Page ${i + 1} of ${numPages})`,
            rotation: page.rotate || 0, // Initialize with page's inherent rotation
          });
        }
      } catch (e: any) {
        console.error("Error processing file into pages for rotation:", file.name, e);
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

  const handleApplyChangesAndDownload = async () => {
    if (selectedPdfItems.length < 1) {
      toast({
        title: "No pages loaded",
        description: "Please upload a PDF to apply changes.",
        variant: "destructive",
      });
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

      if (result.error) {
        setError(result.error);
        toast({
          title: "Processing Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.organizedPdfDataUri) { // Action returns organizedPdfDataUri
        downloadDataUri(result.organizedPdfDataUri, "rotated_document.pdf");
        toast({
          title: "Processing Successful!",
          description: "Your PDF pages have been processed and download has started.",
        });
        setSelectedPdfItems([]);
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during processing.";
      setError(errorMessage);
      toast({ title: "Processing Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
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
    // No initial plus button if items are present, similar to organize page
    selectedPdfItems.forEach((pageItem, index) => {
      displayItems.push({ type: 'pdf_page', id: pageItem.id, data: pageItem, originalItemIndex: index });
      displayItems.push({ type: 'add_button', id: `add-slot-${index + 1}`, insertAtIndex: index + 1 });
    });
  }


  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <RotateCcw className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Rotate PDF Pages</h1>
        <p className="text-muted-foreground mt-2">
          Upload a PDF. Rotate individual pages, reorder if needed, and then download.
        </p>
      </header>

      {selectedPdfItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>Select or drag a PDF file. Its pages will be displayed for rotation and reordering.</CardDescription>
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
                <CardTitle>Rotation & Reorder Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="default" className="text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Rotate pages using buttons on each card. Drag to reorder.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleSortByName} variant="outline" className="w-full" disabled={selectedPdfItems.length < 2}>
                  <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort Pages
                </Button>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleApplyChangesAndDownload}
                  disabled={selectedPdfItems.length < 1 || isProcessing || isLoadingPreviews}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Apply Changes & Download ({selectedPdfItems.length})
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

    