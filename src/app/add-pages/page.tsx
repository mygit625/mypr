
"use client";

import { useState, useCallback, ChangeEvent } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { FilePlus2, Loader2, Info, Download, Trash2, FileIcon, CheckCircle, PlusCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { getInitialPageDataAction, addPagesToPdfAction, type PageData } from './actions';
import { cn } from '@/lib/utils';

interface SourcePdfItem {
  id: string;
  file: File;
  dataUri: string;
  name: string;
}

const PREVIEW_TARGET_HEIGHT_TARGET = 150;
const PREVIEW_TARGET_HEIGHT_SOURCE = 80;

export default function AddPagesPage() {
  const [targetPdfFile, setTargetPdfFile] = useState<File | null>(null);
  const [targetPdfDataUri, setTargetPdfDataUri] = useState<string | null>(null);
  const [targetPdfPages, setTargetPdfPages] = useState<PageData[]>([]);
  
  const [sourcePdfItems, setSourcePdfItems] = useState<SourcePdfItem[]>([]);
  const [insertionPageNumber, setInsertionPageNumber] = useState<string>('');

  const [isLoadingTarget, setIsLoadingTarget] = useState(false);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTargetFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const file = selectedFiles[0];
      setTargetPdfFile(file);
      setError(null);
      setTargetPdfPages([]);
      setIsLoadingTarget(true);
      setTargetPdfDataUri(null);
      try {
        const dataUri = await readFileAsDataURL(file);
        setTargetPdfDataUri(dataUri);
        const result = await getInitialPageDataAction({ pdfDataUri: dataUri });
        if (result.error) {
          setError(result.error);
          toast({ title: "Error loading target PDF", description: result.error, variant: "destructive" });
          setTargetPdfFile(null); setTargetPdfDataUri(null);
        } else if (result.pages) {
          setTargetPdfPages(result.pages.map(p => ({ ...p, rotation: 0 /* Assuming default rotation */ })));
        }
      } catch (e: any) {
        setError(e.message || "Failed to read or process target PDF.");
        toast({ title: "Target PDF Error", description: e.message, variant: "destructive" });
        setTargetPdfFile(null); setTargetPdfDataUri(null);
      } finally {
        setIsLoadingTarget(false);
      }
    } else {
      setTargetPdfFile(null); setTargetPdfDataUri(null); setTargetPdfPages([]);
    }
  };

  const processSourceFiles = async (files: File[]): Promise<SourcePdfItem[]> => {
    setIsLoadingSources(true);
    const newItems: SourcePdfItem[] = [];
    for (const file of files) {
      if (sourcePdfItems.find(item => item.name === file.name && item.file.size === file.size)) {
        console.warn(`Skipping duplicate source file: ${file.name}`);
        continue;
      }
      try {
        const dataUri = await readFileAsDataURL(file);
        newItems.push({ id: crypto.randomUUID(), file, dataUri, name: file.name });
      } catch (e: any) {
        console.error("Error reading source file:", file.name, e);
        toast({ title: "Source File Read Error", description: `Could not read: ${file.name}. ${e.message}`, variant: "destructive" });
      }
    }
    setIsLoadingSources(false);
    return newItems;
  };

  const handleSourceFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    const processedNewItems = await processSourceFiles(newFiles);
    setSourcePdfItems((prevItems) => [...prevItems, ...processedNewItems]);
  };
  
  const handleRemoveSourceFile = (idToRemove: string) => {
    setSourcePdfItems((prevItems) => prevItems.filter(item => item.id !== idToRemove));
  };


  const handleAddPagesAndDownload = async () => {
    if (!targetPdfDataUri || !targetPdfFile) {
      toast({ title: "Target PDF Missing", description: "Please upload a target PDF.", variant: "destructive" });
      return;
    }
    if (sourcePdfItems.length === 0) {
      toast({ title: "Source PDFs Missing", description: "Please upload at least one source PDF.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);

    const insertionNum = insertionPageNumber.trim() === '' ? undefined : parseInt(insertionPageNumber, 10);
    if (insertionPageNumber.trim() !== '' && (isNaN(insertionNum!) || insertionNum! <= 0)) {
        toast({ title: "Invalid Page Number", description: "Insertion page number must be a positive number.", variant: "destructive"});
        setIsProcessing(false);
        return;
    }

    try {
      const sourceUris = sourcePdfItems.map(item => item.dataUri);
      const result = await addPagesToPdfAction({ 
        targetPdfDataUri, 
        sourcePdfDataUris: sourceUris, 
        insertionPageNumber: insertionNum 
      });

      if (result.error) {
        setError(result.error);
        toast({ title: "Processing Error", description: result.error, variant: "destructive" });
      } else if (result.modifiedPdfDataUri) {
        downloadDataUri(result.modifiedPdfDataUri, `modified_${targetPdfFile.name}`);
        toast({ title: "Processing Successful!", description: "Pages added and download started." });
        // Optionally reset state
        // setTargetPdfFile(null); setTargetPdfDataUri(null); setTargetPdfPages([]);
        // setSourcePdfItems([]); setInsertionPageNumber('');
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      toast({ title: "Processing Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center">
        <FilePlus2 className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Add Pages to PDF</h1>
        <p className="text-muted-foreground mt-2">
          Insert pages from one or more PDFs into another PDF document.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Target PDF & Previews */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>1. Upload Target PDF</CardTitle>
              <CardDescription>Select the main PDF document you want to add pages to.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadZone onFilesSelected={handleTargetFileSelected} multiple={false} accept="application/pdf" />
            </CardContent>
          </Card>

          {isLoadingTarget && (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading target PDF...</p>
            </div>
          )}

          {targetPdfDataUri && targetPdfPages.length > 0 && !isLoadingTarget && (
            <Card>
              <CardHeader>
                <CardTitle>Target PDF Preview ({targetPdfPages.length} Pages)</CardTitle>
                <CardDescription>This is the document pages will be added to.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] border rounded-md p-2 bg-muted/20">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-2">
                    {targetPdfPages.map((page) => (
                      <div key={`target-preview-${page.originalIndex}-${page.id}`} className="flex flex-col items-center p-1.5 border rounded-md bg-card shadow-sm">
                        <PdfPagePreview
                          pdfDataUri={targetPdfDataUri}
                          pageIndex={page.originalIndex}
                          rotation={0}
                          targetHeight={PREVIEW_TARGET_HEIGHT_TARGET}
                          className="my-1"
                        />
                        <span className="text-xs mt-1 text-muted-foreground">Page {page.originalIndex + 1}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Source PDFs & Options */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-20 self-start">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>2. Upload Source PDF(s)</CardTitle>
              <CardDescription>Select one or more PDFs whose pages you want to insert.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadZone onFilesSelected={handleSourceFilesSelected} multiple={true} accept="application/pdf" maxFiles={10} />
              {isLoadingSources && (
                <div className="flex justify-center items-center pt-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="ml-2 text-xs text-muted-foreground">Loading source previews...</p>
                </div>
              )}
              {sourcePdfItems.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-medium">Files to Add ({sourcePdfItems.length}):</Label>
                  <ScrollArea className="h-48 border rounded-md p-2">
                    {sourcePdfItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-1.5 bg-muted/30 rounded mb-1.5 text-sm">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                           {item.dataUri && (
                            <PdfPagePreview 
                                pdfDataUri={item.dataUri} 
                                pageIndex={0} 
                                targetHeight={PREVIEW_TARGET_HEIGHT_SOURCE}
                                className="border-none shadow-none rounded-sm bg-white"
                                />
                           )}
                          <span className="truncate text-xs" title={item.name}>{item.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSourceFile(item.id)} className="h-6 w-6">
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>3. Insertion Point</CardTitle>
              <CardDescription>
                Enter the page number in the Target PDF <span className="font-semibold">before</span> which new pages should be inserted.
                Leave blank to append to the end. (e.g., '1' for beginning, '{targetPdfPages.length > 0 ? targetPdfPages.length + 1 : 'N+1'}' for end).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input 
                type="number"
                placeholder={`e.g., 1 or ${targetPdfPages.length > 0 ? targetPdfPages.length + 1 : '2'}`}
                value={insertionPageNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInsertionPageNumber(e.target.value)}
                min="1"
                disabled={!targetPdfFile || sourcePdfItems.length === 0}
              />
            </CardContent>
          </Card>
          
          <Button
            onClick={handleAddPagesAndDownload}
            disabled={!targetPdfFile || sourcePdfItems.length === 0 || isProcessing || isLoadingTarget || isLoadingSources}
            className="w-full text-lg py-6"
            size="lg"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Download className="mr-2 h-5 w-5" />
            )}
            Add Pages & Download
          </Button>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

