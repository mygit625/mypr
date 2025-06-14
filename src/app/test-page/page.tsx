
"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { FlaskConical, Loader2, Info, Plus, ArrowDownAZ, X, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { assemblePdfAction } from './actions';
import { cn } from '@/lib/utils';

// Removed pdfjsLib import as it's not needed for first-page preview only

interface SelectedPdfItem {
  id: string;
  file: File;
  dataUri: string;
  name: string;
  // numPages removed
}

interface DisplayItem {
  type: 'pdf' | 'add_button';
  id: string;
  data?: SelectedPdfItem;
  originalPdfIndex?: number;
  insertAtIndex?: number;
}

const PREVIEW_TARGET_HEIGHT_TEST = 180; // Restored constant name and typical value

export default function TestPage() {
  const [selectedPdfItems, setSelectedPdfItems] = useState<SelectedPdfItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertAtIndexRef = useRef<number | null>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  useEffect(() => {
    setError(null);
  }, [selectedPdfItems]);

  const processFiles = async (files: File[]): Promise<SelectedPdfItem[]> => {
    setIsLoadingPreviews(true);
    const newItems: SelectedPdfItem[] = [];
    for (const file of files) {
      if (selectedPdfItems.find(item => item.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) {
         console.warn(`Skipping duplicate file: ${file.name}`);
         continue;
      }
      try {
        const dataUri = await readFileAsDataURL(file);
        // Removed logic for getting numPages
        newItems.push({
          id: crypto.randomUUID(),
          file,
          dataUri,
          name: file.name,
        });
      } catch (e: any) {
        console.error("Error reading file:", file.name, e);
        toast({
          title: "File Read Error",
          description: `Could not read file: ${file.name}. ${e.message}`,
          variant: "destructive",
        });
      }
    }
    setIsLoadingPreviews(false);
    return newItems;
  };

  const handleFilesSelected = async (newFiles: File[], insertAt: number | null) => {
    if (newFiles.length === 0) return;
    const processedNewItems = await processFiles(newFiles);

    setSelectedPdfItems((prevItems) => {
      const updatedItems = [...prevItems];
      if (insertAt !== null && insertAt >= 0 && insertAt <= updatedItems.length) {
        updatedItems.splice(insertAt, 0, ...processedNewItems);
      } else {
        updatedItems.push(...processedNewItems);
      }
      return updatedItems;
    });
    insertAtIndexRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInitialFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 0) {
      setSelectedPdfItems([]);
      return;
    }
    const processedNewItems = await processFiles(newFiles);
    setSelectedPdfItems(processedNewItems);
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
      [...prevItems].sort((a, b) => a.name.localeCompare(b.name))
    );
    toast({ description: "Files sorted by name (A-Z)." });
  };

  const handleAssembleAndDownload = async () => {
    if (selectedPdfItems.length < 1) {
      toast({
        title: "No files",
        description: "Please select at least one PDF file to assemble.",
        variant: "destructive",
      });
      return;
    }

    setIsAssembling(true);
    setError(null);

    try {
      const dataUris = selectedPdfItems.map(item => item.dataUri);
      const result = await assemblePdfAction({ orderedPdfDataUris: dataUris });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Assembly Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.assembledPdfDataUri) {
        downloadDataUri(result.assembledPdfDataUri, "test_assembled_document.pdf");
        toast({
          title: "Test Assembly Successful!",
          description: "Your PDFs have been assembled and download has started.",
        });
        setSelectedPdfItems([]);
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during assembly.";
      setError(errorMessage);
      toast({ title: "Assembly Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsAssembling(false);
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

    selectedPdfItems.forEach((pdfItem, pdfIndex) => {
      displayItems.push({ type: 'pdf', id: pdfItem.id, data: pdfItem, originalPdfIndex: pdfIndex });
      displayItems.push({ type: 'add_button', id: `add-slot-${pdfIndex + 1}`, insertAtIndex: pdfIndex + 1 });
    });
  }


  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <FlaskConical className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Test Page</h1>
        <p className="text-muted-foreground mt-2">
          This is a test page with the same layout and features as Add PDF Pages. Drag and drop to reorder.
        </p>
      </header>

      {selectedPdfItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDFs</CardTitle>
            <CardDescription>Select or drag and drop the PDF files you want to add together (up to 10 files initially).</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleInitialFilesSelected} multiple accept="application/pdf" maxFiles={10} />
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

      {isLoadingPreviews && selectedPdfItems.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Loading initial previews...</p>
        </div>
      )}

      {(selectedPdfItems.length > 0 || (isLoadingPreviews && selectedPdfItems.length > 0)) && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-grow lg:w-3/4">
            <ScrollArea className="h-[calc(100vh-280px)] p-1 border rounded-md bg-muted/10">
              <div className="flex flex-wrap items-center gap-px p-1"> {/* items-center for vertical alignment */}
                {displayItems.map((item) => {
                  if (item.type === 'pdf' && item.data) {
                    const pdfItem = item.data;
                    return (
                      <Card
                        key={pdfItem.id}
                        draggable
                        onDragStart={() => handleDragStart(item.originalPdfIndex!)}
                        onDragEnter={() => handleDragEnter(item.originalPdfIndex!)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        className="flex flex-col items-center p-3 shadow-md hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing bg-card h-full justify-between w-44" // Restored width
                      >
                        <div className="relative w-full mb-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(pdfItem.id)}
                            className="absolute top-1 right-1 z-10 h-7 w-7 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                            aria-label="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="flex justify-center items-center w-full h-auto" style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_TEST + 20}px`}}>
                            <PdfPagePreview
                                pdfDataUri={pdfItem.dataUri}
                                pageIndex={0} // Only first page
                                targetHeight={PREVIEW_TARGET_HEIGHT_TEST}
                                className="border rounded"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-center truncate w-full px-1 text-muted-foreground" title={pdfItem.name}>
                          {pdfItem.name}
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
                          aria-label={`Add PDF files at position ${item.insertAtIndex}`}
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
                        <p className="ml-2 text-muted-foreground">Loading file previews...</p>
                    </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="lg:w-1/4 space-y-4 lg:sticky lg:top-24 self-start">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle>Test Assembly Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="default" className="text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    To change the order of your PDFs, drag and drop the files as you want. Use the '+' buttons to insert more PDFs.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleSortByName} variant="outline" className="w-full" disabled={selectedPdfItems.length < 2}>
                  <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort A-Z
                </Button>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleAssembleAndDownload}
                  disabled={selectedPdfItems.length < 1 || isAssembling || isLoadingPreviews}
                  className="w-full"
                  size="lg"
                >
                  {isAssembling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FlaskConical className="mr-2 h-4 w-4" />
                  )}
                  Test Assemble & Download ({selectedPdfItems.length})
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
