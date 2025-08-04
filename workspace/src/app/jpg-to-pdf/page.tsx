
"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImagePlus, Loader2, Info, Plus, ArrowDownAZ, X, GripVertical, Download, FileType, CheckCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { convertJpgsToPdfAction, convertSingleJpgToPdfAction, type CompressionLevel } from '@/app/jpg-to-pdf/actions';
import { cn } from '@/lib/utils';
import { PageConfetti } from '@/components/ui/page-confetti';

interface SelectedImageItem {
  id: string;
  file: File;
  dataUri: string;
  name: string;
}

interface DisplayItem {
  type: 'image_card' | 'add_button';
  id: string;
  data?: SelectedImageItem;
  originalItemIndex?: number;
  insertAtIndex?: number;
}

const PREVIEW_TARGET_HEIGHT_JPG_TO_PDF = 180;

export default function JpgToPdfPage() {
  const [selectedImageItems, setSelectedImageItems] = useState<SelectedImageItem[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isConvertingSingleImageId, setIsConvertingSingleImageId] = useState<string | null>(null);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>("recommended");
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertAtIndexRef = useRef<number | null>(null);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  const resetState = () => {
    setSelectedImageItems([]);
    setProcessedUri(null);
    setError(null);
    setShowConfetti(false);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    setError(null);
  }, [selectedImageItems]);

  const processFiles = async (files: File[]): Promise<SelectedImageItem[]> => {
    setIsLoadingPreviews(true);
    const newImageItems: SelectedImageItem[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/jpeg')) {
        toast({
          title: "Invalid File Type",
          description: `Skipping non-JPG file: ${file.name}. Please upload JPG images only.`,
          variant: "destructive",
        });
        continue;
      }
      if (selectedImageItems.some(item => item.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) {
        console.warn(`Skipping duplicate image file: ${file.name}`);
        toast({ description: `Duplicate file skipped: ${file.name}`});
        continue;
      }

      try {
        const dataUri = await readFileAsDataURL(file);
        newImageItems.push({
          id: crypto.randomUUID(),
          file: file,
          dataUri: dataUri,
          name: file.name,
        });
      } catch (e: any) {
        console.error("Error processing image file:", file.name, e);
        toast({
          title: "File Process Error",
          description: `Could not process file: ${file.name}. ${e.message}`,
          variant: "destructive",
        });
      }
    }
    setIsLoadingPreviews(false);
    return newImageItems;
  };

  const handleFilesSelected = async (newFilesFromInput: File[], insertAt: number | null) => {
    if (newFilesFromInput.length === 0) return;

    const processedNewImageItems = await processFiles(newFilesFromInput);
    if (processedNewImageItems.length === 0 && newFilesFromInput.length > 0) {
        return;
    }

    setSelectedImageItems((prevItems) => {
      const updatedItems = [...prevItems];
      if (insertAt !== null && insertAt >= 0 && insertAt <= updatedItems.length) {
        updatedItems.splice(insertAt, 0, ...processedNewImageItems);
      } else {
        updatedItems.push(...processedNewImageItems);
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
      setSelectedImageItems([]);
      return;
    }
    const processedNewImageItems = await processFiles(newFilesFromInput);
    setSelectedImageItems(processedNewImageItems);
  };

  const handleRemoveImage = (idToRemove: string) => {
    setSelectedImageItems((prevItems) => prevItems.filter(item => item.id !== idToRemove));
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
    setSelectedImageItems((prevItems) =>
      [...prevItems].sort((a, b) => a.name.localeCompare(b.name))
    );
    toast({ description: "Images sorted by name." });
  };

  const handleDownloadSingleImageAsPdf = async (item: SelectedImageItem) => {
    setIsConvertingSingleImageId(item.id);
    setError(null);
    try {
      const result = await convertSingleJpgToPdfAction({
        jpgDataUri: item.dataUri,
        filename: item.name,
        compressionLevel: compressionLevel,
      });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Conversion Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.pdfDataUri) {
        const pdfFileName = item.name.replace(/\.(jpg|jpeg)$/i, '.pdf');
        downloadDataUri(result.pdfDataUri, pdfFileName);
        toast({
          title: "PDF Downloaded",
          description: `${item.name} converted to PDF and download started.`,
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || `Failed to convert ${item.name} to PDF.`;
      setError(errorMessage);
      toast({ title: "Conversion Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsConvertingSingleImageId(null);
    }
  };

  const handleCombineAndDownload = async () => {
    if (selectedImageItems.length < 1) {
      toast({
        title: "No Images Selected",
        description: "Please upload JPG images to convert.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      const jpgsToConvert = selectedImageItems.map(item => ({
        dataUri: item.dataUri,
        filename: item.name
      }));

      const result = await convertJpgsToPdfAction({
        jpgsToConvert,
        compressionLevel: compressionLevel,
      });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Conversion Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.pdfDataUri) {
        setProcessedUri(result.pdfDataUri);
        setShowConfetti(true);
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during PDF creation.";
      setError(errorMessage);
      toast({ title: "Conversion Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (processedUri) {
        downloadDataUri(processedUri, "converted_document.pdf");
    }
  };

  const handleDragStart = (index: number) => { dragItemIndex.current = index; };
  const handleDragEnter = (index: number) => { dragOverItemIndex.current = index; };
  const handleDragEnd = () => {
    if (dragItemIndex.current !== null && dragOverItemIndex.current !== null && dragItemIndex.current !== dragOverItemIndex.current) {
      const newItems = [...selectedImageItems];
      const draggedItem = newItems.splice(dragItemIndex.current, 1)[0];
      newItems.splice(dragOverItemIndex.current, 0, draggedItem);
      setSelectedImageItems(newItems);
    }
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement | HTMLButtonElement>) => { e.preventDefault(); };

  const displayItems: DisplayItem[] = [];
  if (selectedImageItems.length > 0 || isLoadingPreviews) {
    selectedImageItems.forEach((imgItem, index) => {
      displayItems.push({ type: 'image_card', id: imgItem.id, data: imgItem, originalItemIndex: index });
      displayItems.push({ type: 'add_button', id: `add-slot-${index + 1}`, insertAtIndex: index + 1 });
    });
  }

  const compressionOptionList: { value: CompressionLevel; label: string; description: string }[] = [
    { value: "extreme", label: "EXTREME COMPRESSION", description: "Smaller file size, may reduce quality" },
    { value: "recommended", label: "RECOMMENDED COMPRESSION", description: "Good balance of size and quality" },
    { value: "less", label: "LESS COMPRESSION", description: "Larger file size, higher quality" },
  ];

  return (
    <div className="max-w-full mx-auto space-y-8">
      <PageConfetti active={showConfetti} />
      <header className="text-center py-8">
        <ImagePlus className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">JPG to PDF Converter</h1>
        <p className="text-muted-foreground mt-2">
          Upload JPG images. Reorder them as needed, then combine into a single PDF document.
        </p>
      </header>

      {selectedImageItems.length === 0 && !isLoadingPreviews && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload JPG Images</CardTitle>
            <CardDescription>Select or drag and drop JPG files. (Max 10 files initially)</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleInitialFilesSelected} multiple={true} accept="image/jpeg" maxFiles={10} />
          </CardContent>
        </Card>
      )}

      <input
          type="file"
          ref={fileInputRef}
          onChange={handleHiddenInputChange}
          multiple={true}
          accept="image/jpeg"
          className="hidden"
      />

      {isLoadingPreviews && selectedImageItems.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Processing images...</p>
        </div>
      )}

      {(selectedImageItems.length > 0 || (isLoadingPreviews && selectedImageItems.length > 0)) && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-grow lg:w-3/4">
            <ScrollArea className="h-[calc(100vh-280px)] p-1 border rounded-md bg-muted/10">
              <div className="flex flex-wrap items-start gap-3 p-2">
                {displayItems.map((item) => {
                  if (item.type === 'image_card' && item.data) {
                    const imgItem = item.data;
                    const isCurrentlyConvertingThisImage = isConvertingSingleImageId === imgItem.id;
                    return (
                      <Card
                        key={imgItem.id}
                        draggable
                        onDragStart={() => handleDragStart(item.originalItemIndex!)}
                        onDragEnter={() => handleDragEnter(item.originalItemIndex!)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        className="flex flex-col items-center p-3 shadow-md hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing bg-card h-full justify-between w-52"
                      >
                        <div className="relative w-full mb-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveImage(imgItem.id)}
                            className="absolute top-1 right-1 z-10 h-7 w-7 bg-background/50 hover:bg-destructive/80 hover:text-destructive-foreground rounded-full"
                            aria-label="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div
                            className="flex justify-center items-center w-full bg-slate-100 dark:bg-slate-800 rounded-md border"
                            style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_JPG_TO_PDF}px`, height: `${PREVIEW_TARGET_HEIGHT_JPG_TO_PDF}px` }}
                           >
                            <img
                                src={imgItem.dataUri}
                                alt={`Preview of ${imgItem.name}`}
                                className="object-contain w-full h-full rounded-md"
                                style={{ maxHeight: `${PREVIEW_TARGET_HEIGHT_JPG_TO_PDF}px` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-center truncate w-full px-1 text-muted-foreground" title={imgItem.name}>
                          {imgItem.name}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => handleDownloadSingleImageAsPdf(imgItem)}
                          disabled={isConverting || isConvertingSingleImageId !== null}
                        >
                          {isCurrentlyConvertingThisImage ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileType className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Download as PDF
                        </Button>
                        <GripVertical className="h-5 w-5 text-muted-foreground/50 mt-1.5" aria-hidden="true" />
                      </Card>
                    );
                  } else if (item.type === 'add_button') {
                    return (
                      <div key={item.id} className="flex items-center justify-center self-stretch h-auto w-12">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => { if (!isLoadingPreviews && !isConverting && !isConvertingSingleImageId) handleAddFilesTrigger(item.insertAtIndex!); }}
                          disabled={isLoadingPreviews || isConverting || isConvertingSingleImageId !== null}
                          className="rounded-full h-10 w-10 shadow-sm hover:shadow-md hover:border-primary/80 hover:text-primary/80 transition-all"
                          aria-label={`Add JPG images at position ${item.insertAtIndex}`}
                        >
                          {(isLoadingPreviews && insertAtIndexRef.current === item.insertAtIndex) ? (
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
                 {isLoadingPreviews && selectedImageItems.length > 0 && displayItems.length === 0 && (
                    <div className="col-span-full flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2 text-muted-foreground">Loading image previews...</p>
                    </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="lg:w-1/4 space-y-4 lg:sticky lg:top-24 self-start">
            <Card className="shadow-lg">
              <CardHeader className="text-center pb-3">
                <CardTitle className="text-xl font-semibold">Conversion Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <Alert variant="default" className="text-sm p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Drag and drop image cards to set their order in the final PDF.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleSortByName} variant="outline" className="w-full" disabled={selectedImageItems.length < 2 || isConverting || isConvertingSingleImageId !== null}>
                  <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort Images A-Z
                </Button>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Compression Level</Label>
                  <RadioGroup value={compressionLevel} onValueChange={(value) => setCompressionLevel(value as CompressionLevel)} className="space-y-1">
                    {compressionOptionList.map((option) => (
                      <Label
                        key={option.value}
                        htmlFor={`comp-level-${option.value}`}
                        className={cn(
                          "flex flex-col p-2.5 border rounded-md cursor-pointer hover:border-primary transition-all",
                          compressionLevel === option.value && "border-primary ring-2 ring-primary bg-primary/5"
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs text-primary">{option.label}</span>
                          <RadioGroupItem value={option.value} id={`comp-level-${option.value}`} className="sr-only" />
                          {compressionLevel === option.value && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5">{option.description}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                {processedUri ? (
                    <>
                        <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg">
                            <Download className="mr-2 h-5 w-5"/> Download Combined PDF
                        </Button>
                        <Button onClick={resetState} className="w-full" variant="outline">
                            Convert More Images
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={handleCombineAndDownload}
                        disabled={selectedImageItems.length < 1 || isConverting || isLoadingPreviews || isConvertingSingleImageId !== null}
                        className="w-full"
                        size="lg"
                    >
                        {isConverting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        Combine & Download PDF ({selectedImageItems.length})
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
    </div>
  );
}
