
"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import html2canvas from 'html2canvas';

import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Presentation, Loader2, Info, Plus, ArrowRightCircle, X, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL, readFileAsArrayBuffer } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { cn } from '@/lib/utils';

interface SelectedPptxItem {
  id: string;
  file: File;
  dataUri: string;
  name: string;
}

interface DisplayItem {
  type: 'pptx' | 'add_button';
  id: string;
  data?: SelectedPptxItem;
  originalItemIndex?: number;
  insertAtIndex?: number;
}

const ACCEPTED_FILE_TYPES = "application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint";

export default function PowerPointToPdfPage() {
  const [selectedItems, setSelectedItems] = useState<SelectedPptxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const renderContainerRef = useRef<HTMLDivElement>(null);
  const insertAtIndexRef = useRef<number | null>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  useEffect(() => {
    setError(null);
  }, [selectedItems]);

  const processFiles = async (files: File[]): Promise<SelectedPptxItem[]> => {
    setIsLoading(true);
    const newItems: SelectedPptxItem[] = [];
    for (const file of files) {
      if (selectedItems.find(item => item.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) {
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
        toast({ title: "File Read Error", description: `Could not read file: ${file.name}.`, variant: "destructive" });
      }
    }
    setIsLoading(false);
    return newItems;
  };

  const handleFilesSelected = async (newFiles: File[], insertAt: number | null) => {
    if (newFiles.length === 0) return;
    const processedNewItems = await processFiles(newFiles);
    
    setSelectedItems((prevItems) => {
      const updatedItems = [...prevItems];
      if (insertAt !== null && insertAt >= 0 && insertAt <= updatedItems.length) {
        updatedItems.splice(insertAt, 0, ...processedNewItems);
      } else {
        updatedItems.push(...processedNewItems); 
      }
      return updatedItems;
    });
    insertAtIndexRef.current = null; 
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };
  
  const handleInitialFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 0) {
      setSelectedItems([]);
      return;
    }
    const processedNewItems = await processFiles(newFiles);
    setSelectedItems(processedNewItems);
  };

  const handleRemoveFile = (idToRemove: string) => {
    setSelectedItems((prevItems) => prevItems.filter(item => item.id !== idToRemove));
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

  const handleConvertAndDownload = async () => {
    if (selectedItems.length < 1) {
      toast({ title: "No files", description: "Please select at least one PowerPoint file.", variant: "destructive" });
      return;
    }
    
    setIsConverting(true);
    setError(null);
    toast({ description: "Conversion started. This may take a moment...", duration: 5000 });

    try {
      const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            return resolve();
          }
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load a required script from the network: ${src}. Please check your internet connection.`));
          document.body.appendChild(script);
      });

      // Load dependencies from CDN in the correct order
      await loadScript('https://code.jquery.com/jquery-3.7.1.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/pptx-preview@0.0.6/dist/pptx-preview.min.js');
      
      const render = (window as any).pptx?.render;

      if (typeof render !== 'function') {
        throw new Error('The PowerPoint conversion library (pptx-preview) failed to initialize correctly after loading.');
      }

      const pdfDoc = await PDFDocument.create();
      
      for (const item of selectedItems) {
        if (!renderContainerRef.current) throw new Error("Render container not found.");
        
        // Clear previous render
        renderContainerRef.current.innerHTML = "";

        const arrayBuffer = await readFileAsArrayBuffer(item.file);
        // Render all slides into the hidden container
        await render(arrayBuffer, renderContainerRef.current, undefined, {
          useFixedSlideSizes: true,
        });

        // Find all rendered slide elements
        const slideElements = renderContainerRef.current.querySelectorAll('.slide-container');
        if (slideElements.length === 0) {
          console.warn(`No slides rendered for ${item.name}`);
          continue;
        }

        // Capture each slide as an image and add to PDF
        for (let i = 0; i < slideElements.length; i++) {
          const slideElement = slideElements[i] as HTMLElement;
          const canvas = await html2canvas(slideElement, { logging: false, scale: 2 });
          const jpgDataUri = canvas.toDataURL('image/jpeg', 0.9);
          const jpgImage = await pdfDoc.embedJpg(jpgDataUri);
          const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
          page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: jpgImage.width,
            height: jpgImage.height,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const pdfDataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
      downloadDataUri(pdfDataUri, "converted_presentation.pdf");
      
      toast({ title: "Conversion Successful!", description: "Your presentation has been converted to PDF." });
      setSelectedItems([]);

    } catch (e: any) {
      console.error("PPTX Conversion Error:", e);
      setError(e.message || "An unknown error occurred during conversion.");
      toast({ title: "Conversion Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsConverting(false);
      // Clean up render container
      if (renderContainerRef.current) {
        renderContainerRef.current.innerHTML = "";
      }
    }
  };
  
  const handleDragStart = (index: number) => { dragItemIndex.current = index; };
  const handleDragEnter = (index: number) => { dragOverItemIndex.current = index; };
  const handleDragEnd = () => {
    if (dragItemIndex.current !== null && dragOverItemIndex.current !== null && dragItemIndex.current !== dragOverItemIndex.current) {
      const newItems = [...selectedItems];
      const draggedItem = newItems.splice(dragItemIndex.current, 1)[0];
      newItems.splice(dragOverItemIndex.current, 0, draggedItem);
      setSelectedItems(newItems);
    }
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement | HTMLButtonElement>) => { e.preventDefault(); };

  const displayItems: DisplayItem[] = [];
  if (selectedItems.length > 0 || isLoading) {
    displayItems.push({ type: 'add_button', id: 'add-slot-0', insertAtIndex: 0 });
    selectedItems.forEach((item, index) => {
      displayItems.push({ type: 'pptx', id: item.id, data: item, originalItemIndex: index });
      displayItems.push({ type: 'add_button', id: `add-slot-${index + 1}`, insertAtIndex: index + 1 });
    });
  }
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-full mx-auto space-y-8">
       {/* Hidden container for rendering slides */}
      <div ref={renderContainerRef} className="hidden" aria-hidden="true"></div>

      <header className="text-center py-8">
        <Presentation className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">PowerPoint to PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Convert your PPTX or PPT files to PDF. Upload multiple files, reorder them, and convert them all at once.
        </p>
      </header>

      {selectedItems.length === 0 && !isLoading && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PowerPoint Files</CardTitle>
            <CardDescription>Select or drag and drop PPTX or PPT files to convert.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleInitialFilesSelected} multiple accept={ACCEPTED_FILE_TYPES} />
          </CardContent>
        </Card>
      )}
      
      <input
          type="file"
          ref={fileInputRef}
          onChange={handleHiddenInputChange}
          multiple
          accept={ACCEPTED_FILE_TYPES}
          className="hidden"
      />

      {isLoading && selectedItems.length === 0 && ( 
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Processing files...</p>
        </div>
      )}

      {(selectedItems.length > 0 || (isLoading && selectedItems.length > 0)) && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-grow lg:w-3/4">
            <ScrollArea className="h-[calc(100vh-280px)] p-1 border rounded-md bg-muted/10">
              <div className="flex flex-wrap items-center gap-px p-1">
                {displayItems.map((item) => {
                  if (item.type === 'pptx' && item.data) {
                    const pptxItem = item.data;
                    return (
                      <Card
                        key={pptxItem.id}
                        draggable
                        onDragStart={() => handleDragStart(item.originalItemIndex!)}
                        onDragEnter={() => handleDragEnter(item.originalItemIndex!)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        className="flex flex-col items-center p-3 shadow-md hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing bg-card h-full justify-between w-48"
                      >
                        <div className="relative w-full mb-2">
                           <Badge variant="secondary" className="absolute -top-1 left-1 z-10">{formatBytes(pptxItem.file.size)}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(pptxItem.id)}
                            className="absolute -top-1 -right-1 z-10 h-7 w-7 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                            aria-label="Remove file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="flex justify-center items-center w-full h-36 bg-gray-100 dark:bg-gray-800 rounded-md border my-4">
                             <Presentation className="h-16 w-16 text-orange-600" />
                          </div>
                        </div>
                        <p className="text-xs text-center truncate w-full px-1 text-muted-foreground" title={pptxItem.name}>
                          {pptxItem.name}
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
                          onClick={() => { if (!isLoading) handleAddFilesTrigger(item.insertAtIndex!); }}
                          disabled={isLoading}
                          className="rounded-full h-10 w-10 shadow-sm hover:shadow-md hover:border-primary/80 hover:text-primary/80 transition-all"
                          aria-label={`Add files at position ${item.insertAtIndex}`}
                        >
                          {isLoading && insertAtIndexRef.current === item.insertAtIndex ? (
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
              </div>
            </ScrollArea>
          </div>

          <div className="lg:w-1/4 space-y-4 lg:sticky lg:top-24 self-start">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle>PowerPoint to PDF</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert variant="default" className="text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Drag files to reorder them before conversion. The final PDF will contain all slides from the uploaded files in the specified order.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleConvertAndDownload}
                  disabled={selectedItems.length < 1 || isConverting || isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isConverting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightCircle className="mr-2 h-4 w-4" />
                  )}
                  Convert to PDF ({selectedItems.length})
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
