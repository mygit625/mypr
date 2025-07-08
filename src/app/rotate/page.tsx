
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
import { rotateAllPagesAction } from './actions';
import { cn } from '@/lib/utils';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface SelectedPdfFileItem {
  id: string;
  file: File;
  dataUri: string;
  name: string;
  numPages: number;
  rotation: number; // Rotation for the entire file
}

interface DisplayItem {
  type: 'pdf_file' | 'add_button';
  id: string;
  data?: SelectedPdfFileItem;
  originalItemIndex?: number;
  insertAtIndex?: number;
}

const PREVIEW_TARGET_HEIGHT_ROTATE = 220;

export default function RotatePdfPage() {
  const [selectedPdfItems, setSelectedPdfItems] = useState<SelectedPdfFileItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertAtIndexRef = useRef<number | null>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  useEffect(() => {
    setError(null);
  }, [selectedPdfItems]);

  const processFiles = async (files: File[]): Promise<SelectedPdfFileItem[]> => {
    setIsLoadingPreviews(true);
    const newFileItems: SelectedPdfFileItem[] = [];

    for (const file of files) {
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
        
        newFileItems.push({
          id: crypto.randomUUID(),
          file: file,
          dataUri: dataUri,
          name: file.name,
          numPages: pdfDoc.numPages,
          rotation: 0, 
        });
      } catch (e: any) {
        console.error("Error processing file for rotation:", file.name, e);
        toast({
          title: "File Process Error",
          description: `Could not process file: ${file.name}. ${e.message}`,
          variant: "destructive",
        });
      }
    }
    setIsLoadingPreviews(false);
    return newFileItems;
  };

  const handleFilesSelected = async (newFilesFromInput: File[], insertAt: number | null) => {
    if (newFilesFromInput.length === 0) return;
    
    const processedNewFileItems = await processFiles(newFilesFromInput);

    setSelectedPdfItems((prevItems) => {
      const updatedItems = [...prevItems];
      const uniqueNewItems = processedNewFileItems.filter(newItem => 
        !prevItems.some(existingItem => existingItem.name === newItem.name && existingItem.file.size === newItem.file.size)
      );

      if (insertAt !== null && insertAt >= 0 && insertAt <= updatedItems.length) {
        updatedItems.splice(insertAt, 0, ...uniqueNewItems);
      } else {
        updatedItems.push(...uniqueNewItems);
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
    const processedNewFileItems = await processFiles(newFilesFromInput);
    setSelectedPdfItems(processedNewFileItems);
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
    toast({ description: "Files sorted by name." });
  };

  const handleRotateFile = (fileId: string, direction: 'cw' | 'ccw') => {
    setSelectedPdfItems(prevItems =>
      prevItems.map(item => {
        if (item.id === fileId) {
          const newRotation = (item.rotation + (direction === 'cw' ? 90 : -90) + 360) % 360;
          return { ...item, rotation: newRotation };
        }
        return item;
      })
    );
  };

  const handleRotateAllFiles = (direction: 'cw' | 'ccw') => {
    setSelectedPdfItems(prevItems =>
      prevItems.map(item => {
        const newRotation = (item.rotation + (direction === 'cw' ? 90 : -90) + 360) % 360;
        return { ...item, rotation: newRotation };
      })
    );
    toast({ description: `All files rotated ${direction === 'cw' ? 'right' : 'left'}.` });
  };

  const handleApplyChangesAndDownload = async () => {
    if (selectedPdfItems.length < 1) {
      toast({
        title: "No files loaded",
        description: "Please upload PDF files to apply changes.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);
    let successCount = 0;

    for (const pdfItem of selectedPdfItems) {
      try {
        const result = await rotateAllPagesAction({ 
          pdfDataUri: pdfItem.dataUri, 
          rotation: pdfItem.rotation 
        });

        if (result.error) {
          toast({
            title: `Error processing ${pdfItem.name}`,
            description: result.error,
            variant: "destructive",
          });
        } else if (result.processedPdfDataUri) {
          downloadDataUri(result.processedPdfDataUri, `rotated_${pdfItem.name}`);
          successCount++;
        }
      } catch (e: any) {
        const errorMessage = e.message || "An unexpected error occurred.";
        toast({ 
            title: `Processing Failed for ${pdfItem.name}`, 
            description: errorMessage, 
            variant: "destructive" 
        });
      }
    }

    if (successCount > 0) {
        toast({
            title: "Processing Complete!",
            description: `${successCount} of ${selectedPdfItems.length} PDF(s) processed and downloaded.`,
        });
    }
    if (successCount === selectedPdfItems.length) {
        setSelectedPdfItems([]);
    }
    setIsProcessing(false);
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
    // REMOVED: displayItems.push({ type: 'add_button', id: 'add-slot-0', insertAtIndex: 0 });
    selectedPdfItems.forEach((fileItem, index) => {
      displayItems.push({ type: 'pdf_file', id: fileItem.id, data: fileItem, originalItemIndex: index });
      displayItems.push({ type: 'add_button', id: `add-slot-${index + 1}`, insertAtIndex: index + 1 });
    });
  }


  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <RotateCcw className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Rotate PDF Files</h1>
        <p className="text-muted-foreground mt-2">
          Upload PDF files. Set rotation for each file, reorder if needed, and then download.
        </p>
        <div className="mt-6">
          <p className="text-lg font-medium text-foreground mb-2">Rotate all Pages of All PDF files</p>
          <div className="flex justify-center space-x-2">
            <Button
              variant="outline"
              size="default"
              onClick={() => handleRotateAllFiles('ccw')}
              disabled={selectedPdfItems.length === 0 || isProcessing || isLoadingPreviews}
              aria-label="Rotate All Files Left"
            >
              <RotateCcw className="h-5 w-5 mr-2" /> Rotate All Left
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => handleRotateAllFiles('cw')}
              disabled={selectedPdfItems.length === 0 || isProcessing || isLoadingPreviews}
              aria-label="Rotate All Files Right"
            >
              <RotateCw className="h-5 w-5 mr-2" /> Rotate All Right
            </Button>
          </div>
        </div>
      </header>

      {selectedPdfItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDFs</CardTitle>
            <CardDescription>Select or drag PDF files. Max 5 files. Each file's first page will be previewed.</CardDescription>
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
          <p className="ml-3 text-lg text-muted-foreground">Processing PDF files...</p>
        </div>
      )}

      {(selectedPdfItems.length > 0 || (isLoadingPreviews && selectedPdfItems.length > 0)) && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-grow lg:w-3/4">
            <ScrollArea className="h-[calc(100vh-380px)] p-1 border rounded-md bg-muted/10"> {/* Adjusted height */}
              <div className="flex flex-wrap items-center gap-px p-1">
                {displayItems.map((item) => {
                  if (item.type === 'pdf_file' && item.data) {
                    const fileItem = item.data;
                    return (
                      <Card
                        key={fileItem.id}
                        draggable
                        onDragStart={() => handleDragStart(item.originalItemIndex!)}
                        onDragEnter={() => handleDragEnter(item.originalItemIndex!)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        className="flex flex-col items-center p-3 shadow-md hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing bg-card h-full justify-between w-56"
                      >
                        <div className="relative w-full mb-1">
                           <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(fileItem.id)}
                            className="absolute top-0 right-0 z-10 h-7 w-7 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                            aria-label="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="flex justify-center space-x-1 mb-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRotateFile(fileItem.id, 'ccw')}
                              aria-label="Rotate File Left"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" /> Left
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRotateFile(fileItem.id, 'cw')}
                              aria-label="Rotate File Right"
                            >
                              <RotateCw className="h-4 w-4 mr-1" /> Right
                            </Button>
                          </div>
                          <div className="flex justify-center items-center w-full h-auto border rounded" style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_ROTATE + 20}px`}}>
                            <PdfPagePreview
                                pdfDataUri={fileItem.dataUri}
                                pageIndex={0}
                                rotation={fileItem.rotation}
                                targetHeight={PREVIEW_TARGET_HEIGHT_ROTATE}
                                className="bg-white"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-center truncate w-full px-1 text-muted-foreground mt-1" title={fileItem.name}>
                          {fileItem.name} ({fileItem.numPages} pages)
                        </p>
                        <p className="text-xs text-center text-primary" title={`Current rotation: ${fileItem.rotation}°`}>
                           {fileItem.rotation}°
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
                          aria-label={`Add PDF file(s) at position ${item.insertAtIndex}`}
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
                <CardTitle>File Rotation Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert variant="default" className="text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Set rotation for each PDF file using buttons on its card. Drag to reorder files.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleSortByName} variant="outline" className="w-full" disabled={selectedPdfItems.length < 2}>
                  <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort Files A-Z
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
                  Rotate & Download Files ({selectedPdfItems.length})
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
