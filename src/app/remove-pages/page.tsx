
"use client";

import { useState } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileMinus2, Loader2, Info, Trash2, RefreshCcw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { getInitialPageDataAction, removeSelectedPagesAction, type PageData } from './actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { cn } from '@/lib/utils';

interface PageState extends PageData {
  isMarkedForDeletion: boolean;
}

export default function RemovePagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageState[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const PREVIEW_TARGET_HEIGHT = 120;

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      setFile(selectedFile);
      setError(null);
      setPages([]);
      setIsLoading(true);
      setPdfDataUri(null);
      try {
        const dataUri = await readFileAsDataURL(selectedFile);
        setPdfDataUri(dataUri);
        const result = await getInitialPageDataAction({ pdfDataUri: dataUri });
        if (result.error) {
          setError(result.error);
          toast({ title: "Error loading PDF", description: result.error, variant: "destructive" });
          setPdfDataUri(null); setFile(null);
        } else if (result.pages) {
          setPages(result.pages.map(p => ({ ...p, isMarkedForDeletion: false, rotation: 0 /* Rotation not used here but part of PageData */ })));
        }
      } catch (e: any) {
        setError(e.message || "Failed to read or process file.");
        toast({ title: "File Error", description: e.message, variant: "destructive" });
        setPdfDataUri(null); setFile(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      setFile(null); setPdfDataUri(null); setPages([]);
    }
  };

  const handleTogglePageDeletion = (index: number) => {
    setPages(currentPages =>
      currentPages.map((page, i) =>
        i === index ? { ...page, isMarkedForDeletion: !page.isMarkedForDeletion } : page
      )
    );
  };

  const handleResetSelections = () => {
    setPages(currentPages => currentPages.map(p => ({ ...p, isMarkedForDeletion: false })));
    toast({ title: "Selections Reset", description: "All pages are now marked to be kept." });
  };

  const handleRemoveAndDownload = async () => {
    if (!pdfDataUri || pages.length === 0) {
      toast({ title: "No PDF Loaded", description: "Please upload a PDF.", variant: "destructive" });
      return;
    }

    const pagesToKeepIndices = pages
      .map((page, index) => (!page.isMarkedForDeletion ? page.originalIndex : -1))
      .filter(index => index !== -1);

    if (pagesToKeepIndices.length === 0) {
      toast({ title: "No Pages to Keep", description: "All pages are marked for deletion. Cannot create an empty PDF.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await removeSelectedPagesAction({ pdfDataUri, pagesToKeepIndices });
      if (result.error) {
        setError(result.error);
        toast({ title: "Processing Error", description: result.error, variant: "destructive" });
      } else if (result.processedPdfDataUri) {
        downloadDataUri(result.processedPdfDataUri, `processed_${file?.name || 'document.pdf'}`);
        toast({ title: "Processing Successful!", description: "Your PDF has been processed and download has started." });
        // Optionally reset state after successful download
        // setFile(null); setPdfDataUri(null); setPages([]);
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      toast({ title: "Processing Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getDisplayedPageIndex = (currentIndex: number): number => {
    // This is the original page number
    return pages[currentIndex].originalIndex + 1;
  }
  
  const countKeptPages = pages.filter(p => !p.isMarkedForDeletion).length;
  const countMarkedPages = pages.filter(p => p.isMarkedForDeletion).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <FileMinus2 className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Remove PDF Pages</h1>
        <p className="text-muted-foreground mt-2">
          Select pages to remove from your PDF document.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>Select the PDF file you want to modify.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading PDF pages...</p>
        </div>
      )}

      {error && !isLoading && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {pdfDataUri && pages.length > 0 && !isLoading && (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Manage Pages ({pages.length} total)</CardTitle>
              <CardDescription>
                Click the <Trash2 className="inline h-4 w-4 text-destructive" /> icon to mark a page for deletion.
                Currently keeping: <span className="font-semibold text-green-600">{countKeptPages}</span> pages.
                Marked for deletion: <span className="font-semibold text-red-600">{countMarkedPages}</span> pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] p-1 border rounded-md bg-muted/20">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-2">
                {pages.map((page, index) => (
                  <Card 
                    key={`${page.id}-${index}`} 
                    className={cn(
                        "transition-all shadow-sm bg-card relative overflow-hidden", 
                        page.isMarkedForDeletion && "ring-2 ring-destructive border-destructive"
                    )}
                  >
                    {page.isMarkedForDeletion && (
                        <div className="absolute inset-0 bg-destructive/70 flex items-center justify-center z-10">
                            <span className="text-destructive-foreground font-semibold text-sm">Marked for Deletion</span>
                        </div>
                    )}
                    <div className={cn("p-2 flex flex-col items-center", page.isMarkedForDeletion && "opacity-40")}>
                       <div 
                          className="flex-shrink-0 mb-1 flex items-center justify-center overflow-hidden"
                          style={{ minHeight: `${PREVIEW_TARGET_HEIGHT}px`, width: 'auto', height: `${PREVIEW_TARGET_HEIGHT}px`}}
                        >
                          {pdfDataUri && (
                             <PdfPagePreview
                               pdfDataUri={pdfDataUri}
                               pageIndex={page.originalIndex}
                               rotation={0} // Fixed rotation for this tool
                               targetHeight={PREVIEW_TARGET_HEIGHT}
                             />
                          )}
                       </div>
                      <p className="text-xs text-muted-foreground mb-1.5 text-center">
                        Page {getDisplayedPageIndex(index)}
                      </p>
                      <Button 
                        variant={page.isMarkedForDeletion ? "outline" : "destructive"} 
                        size="sm" 
                        onClick={() => handleTogglePageDeletion(index)} 
                        className="w-full"
                        title={page.isMarkedForDeletion ? "Keep this page" : "Mark to delete this page"}
                        disabled={isLoading || isProcessing}
                      >
                        {page.isMarkedForDeletion ? 
                            <RefreshCcw className="h-4 w-4 mr-1 text-green-600" /> : 
                            <Trash2 className="h-4 w-4 mr-1" />
                        }
                        {page.isMarkedForDeletion ? "Keep" : "Delete"}
                      </Button>
                    </div>
                  </Card>
                ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleResetSelections} disabled={isProcessing || isLoading}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Reset Deletions
                </Button>
                <Button
                  onClick={handleRemoveAndDownload}
                  disabled={isProcessing || isLoading || !file || countKeptPages === 0}
                  size="lg"
                >
                {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Download className="mr-2 h-4 w-4" />
                )}
                Apply & Download ({countKeptPages} pages)
                </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}
