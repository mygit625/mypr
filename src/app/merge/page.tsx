
"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { Combine, Loader2, Info, Plus, ArrowDownAZ, X, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { mergePdfsAction } from './actions';
import { cn } from '@/lib/utils';

interface SelectedPdfItem {
  id: string;
  file: File;
  dataUri: string;
  name: string;
}

const PREVIEW_TARGET_HEIGHT_MERGE = 180;

export default function MergePage() {
  const [selectedPdfItems, setSelectedPdfItems] = useState<SelectedPdfItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  useEffect(() => {
    // Clear error when files change
    setError(null);
  }, [selectedPdfItems]);

  const processFiles = async (files: File[]): Promise<SelectedPdfItem[]> => {
    setIsLoadingPreviews(true);
    const newItems: SelectedPdfItem[] = [];
    for (const file of files) {
      if (selectedPdfItems.find(item => item.name === file.name && item.file.size === file.size)) {
        // Basic duplicate check to avoid adding the exact same file instance again
        // More robust duplicate handling might involve checking file content hashes if needed
        console.warn(`Skipping duplicate file: ${file.name}`);
        continue;
      }
      try {
        const dataUri = await readFileAsDataURL(file);
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

  const handleFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const processedNewItems = await processFiles(newFiles);
    setSelectedPdfItems((prevItems) => [...prevItems, ...processedNewItems]);
  };
  
  const handleInitialFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 0) {
      setSelectedPdfItems([]); // Clear if no files selected
      return;
    }
    const processedNewItems = await processFiles(newFiles);
    setSelectedPdfItems(processedNewItems); // Replace current selection for initial upload
  };


  const handleRemoveFile = (idToRemove: string) => {
    setSelectedPdfItems((prevItems) => prevItems.filter(item => item.id !== idToRemove));
  };

  const handleAddFilesClick = () => {
    fileInputRef.current?.click();
  };

  const handleHiddenInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFilesSelected(Array.from(event.target.files));
    }
  };

  const handleSortByName = () => {
    setSelectedPdfItems((prevItems) =>
      [...prevItems].sort((a, b) => a.name.localeCompare(b.name))
    );
    toast({ description: "Files sorted by name (A-Z)." });
  };

  const handleMerge = async () => {
    if (selectedPdfItems.length < 2) {
      toast({
        title: "Not enough files",
        description: "Please select at least two PDF files to merge.",
        variant: "destructive",
      });
      return;
    }

    setIsMerging(true);
    setError(null);

    try {
      const pdfDataUris = selectedPdfItems.map(item => item.dataUri);
      const result = await mergePdfsAction({ pdfDataUris });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Merge Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.mergedPdfDataUri) {
        downloadDataUri(result.mergedPdfDataUri, "merged_document.pdf");
        toast({
          title: "Merge Successful!",
          description: "Your PDFs have been merged and download has started.",
        });
        setSelectedPdfItems([]); // Clear files after successful merge
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during merge.";
      setError(errorMessage);
      toast({ title: "Merge Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsMerging(false);
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
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };


  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <Combine className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Merge PDF Files</h1>
        <p className="text-muted-foreground mt-2">
          Combine multiple PDF documents into one. Drag and drop to reorder.
        </p>
      </header>

      {selectedPdfItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDFs</CardTitle>
            <CardDescription>Select or drag and drop the PDF files you want to merge (up to 10 files initially).</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleInitialFilesSelected} multiple accept="application/pdf" maxFiles={10} />
          </CardContent>
        </Card>
      )}

      {isLoadingPreviews && selectedPdfItems.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Loading initial previews...</p>
        </div>
      )}

      {selectedPdfItems.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column: File Previews */}
          <div className="flex-grow lg:w-3/4">
            <ScrollArea className="h-[calc(100vh-280px)] p-1 border rounded-md bg-muted/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                {selectedPdfItems.map((item, index) => (
                  <Card
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    className="flex flex-col items-center p-3 shadow-md hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing bg-card"
                  >
                    <div className="relative w-full mb-2">
                       <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(item.id)}
                        className="absolute top-1 right-1 z-10 h-7 w-7 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="flex justify-center items-center w-full h-auto" style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_MERGE + 20}px`}}>
                         <PdfPagePreview
                            pdfDataUri={item.dataUri}
                            pageIndex={0} // First page preview
                            targetHeight={PREVIEW_TARGET_HEIGHT_MERGE}
                            className="border rounded"
                         />
                      </div>
                    </div>
                    <p className="text-xs text-center truncate w-full px-1 text-muted-foreground" title={item.name}>
                      {item.name}
                    </p>
                    <GripVertical className="h-5 w-5 text-muted-foreground/50 mt-1" aria-hidden="true" />
                  </Card>
                ))}
                 {isLoadingPreviews && ( // Spinner for when adding more files
                    <div className="col-span-full flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2 text-muted-foreground">Loading new previews...</p>
                    </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Column: Controls */}
          <div className="lg:w-1/4 space-y-4 lg:sticky lg:top-24 self-start">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle>Merge Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="default" className="text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    To change the order of your PDFs, drag and drop the files as you want.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleAddFilesClick} variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Add More Files
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleHiddenInputChange}
                  multiple
                  accept="application/pdf"
                  className="hidden"
                />
                <Button onClick={handleSortByName} variant="outline" className="w-full" disabled={selectedPdfItems.length < 2}>
                  <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort A-Z
                </Button>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleMerge}
                  disabled={selectedPdfItems.length < 2 || isMerging || isLoadingPreviews}
                  className="w-full"
                  size="lg"
                >
                  {isMerging ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Combine className="mr-2 h-4 w-4" />
                  )}
                  Merge PDFs ({selectedPdfItems.length})
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

    