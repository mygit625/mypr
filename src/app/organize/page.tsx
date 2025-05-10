"use client";

import { useState, useCallback } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LayoutGrid, Loader2, Info, RotateCcw, RotateCw, Trash2, ArrowUp, ArrowDown, Download, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { getInitialPageDataAction, organizePdfAction, type PageData, type PageOperation } from './actions';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper to ensure rotation stays within 0, 90, 180, 270
const normalizeRotation = (angle: number): number => {
  let newAngle = angle % 360;
  if (newAngle < 0) newAngle += 360;
  if (![0, 90, 180, 270].includes(newAngle)) {
    // Snap to nearest valid rotation if somehow it's off
    if (newAngle > 0 && newAngle < 90) newAngle = newAngle < 45 ? 0 : 90;
    else if (newAngle > 90 && newAngle < 180) newAngle = newAngle < 135 ? 90 : 180;
    else if (newAngle > 180 && newAngle < 270) newAngle = newAngle < 225 ? 180 : 270;
    else if (newAngle > 270 && newAngle < 360) newAngle = newAngle < 315 ? 270 : 0;
  }
  return newAngle;
};


export default function OrganizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [originalPages, setOriginalPages] = useState<PageData[]>([]); // For reset functionality
  
  const [isLoading, setIsLoading] = useState(false); // For initial PDF load
  const [isProcessing, setIsProcessing] = useState(false); // For final organization
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      setFile(selectedFile);
      setError(null);
      setPages([]);
      setOriginalPages([]);
      setIsLoading(true);
      try {
        const dataUri = await readFileAsDataURL(selectedFile);
        setPdfDataUri(dataUri);
        const result = await getInitialPageDataAction({ pdfDataUri: dataUri });
        if (result.error) {
          setError(result.error);
          toast({ title: "Error loading PDF", description: result.error, variant: "destructive" });
          setPdfDataUri(null);
          setFile(null);
        } else if (result.pages) {
          const initialPages = result.pages.map(p => ({...p, rotation: normalizeRotation(p.rotation)}));
          setPages(initialPages);
          setOriginalPages(JSON.parse(JSON.stringify(initialPages))); // Deep copy for reset
        }
      } catch (e: any) {
        setError(e.message || "Failed to read or process file.");
        toast({ title: "File Error", description: e.message, variant: "destructive" });
        setPdfDataUri(null);
        setFile(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      setFile(null);
      setPdfDataUri(null);
      setPages([]);
      setOriginalPages([]);
    }
  };

  const handlePageUpdate = (index: number, updates: Partial<PageData>) => {
    setPages(currentPages => 
      currentPages.map((page, i) => 
        i === index ? { ...page, ...updates } : page
      )
    );
  };

  const handleRotate = (index: number, direction: 'cw' | 'ccw') => {
    const page = pages[index];
    let newRotation = page.rotation;
    if (direction === 'cw') {
      newRotation = (page.rotation + 90) % 360;
    } else {
      newRotation = (page.rotation - 90 + 360) % 360;
    }
    handlePageUpdate(index, { rotation: normalizeRotation(newRotation) });
  };

  const handleDeleteToggle = (index: number) => {
    handlePageUpdate(index, { isDeleted: !pages[index].isDeleted });
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    setPages(currentPages => {
      const newPages = [...currentPages];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newPages.length) return newPages;
      [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
      return newPages;
    });
  };

  const handleResetChanges = () => {
    setPages(JSON.parse(JSON.stringify(originalPages))); // Reset to deep copied original state
    toast({ title: "Changes Reset", description: "Page order, rotations, and deletions have been reset." });
  };

  const handleOrganizeAndDownload = async () => {
    if (!pdfDataUri || pages.length === 0) {
      toast({ title: "No PDF or Pages", description: "Please upload a PDF and ensure it has pages.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);

    const operations: PageOperation[] = pages
      .filter(page => !page.isDeleted)
      .map(page => ({
        originalIndex: page.originalIndex,
        rotation: page.rotation,
      }));

    if (operations.length === 0) {
      toast({ title: "No pages selected", description: "All pages are marked for deletion. Cannot create an empty PDF.", variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    try {
      const result = await organizePdfAction({ pdfDataUri, operations });
      if (result.error) {
        setError(result.error);
        toast({ title: "Organization Error", description: result.error, variant: "destructive" });
      } else if (result.organizedPdfDataUri) {
        downloadDataUri(result.organizedPdfDataUri, `organized_${file?.name || 'document.pdf'}`);
        toast({ title: "Organization Successful!", description: "Your PDF has been reorganized and download has started." });
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during organization.");
      toast({ title: "Organization Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getDisplayedPageIndex = (index: number): number => {
    let count = 0;
    for(let i=0; i<=index; i++) {
        if(!pages[i].isDeleted) {
            count++;
        }
    }
    return count;
  }


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <LayoutGrid className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Organize PDF Pages</h1>
        <p className="text-muted-foreground mt-2">
          Reorder, rotate, and delete pages in your PDF document.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>Select the PDF file you want to organize.</CardDescription>
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

      {error && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {pages.length > 0 && !isLoading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Manage Pages</CardTitle>
              <CardDescription>Drag and drop to reorder, or use controls for rotation and deletion. Changes are applied when you click "Apply & Download".</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] p-1 border rounded-md">
                <div className="space-y-3">
                {pages.map((page, index) => (
                  <Card key={page.id} className={`transition-opacity ${page.isDeleted ? 'opacity-50 bg-muted/30' : 'bg-card'}`}>
                    <CardHeader className="py-3 px-4">
                       <CardTitle className="text-md flex justify-between items-center">
                        <span>
                            {page.isDeleted ? 'Page (Deleted)' : `Page ${getDisplayedPageIndex(index)}`} (Original: {page.originalIndex + 1})
                        </span>
                         <Button variant="ghost" size="sm" onClick={() => handleDeleteToggle(index)} title={page.isDeleted ? "Restore Page" : "Delete Page"}>
                            {page.isDeleted ? <RefreshCcw className="h-4 w-4 text-green-600" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                         </Button>
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-4 text-sm text-muted-foreground">
                        Dimensions: {page.width.toFixed(0)}pt x {page.height.toFixed(0)}pt | Rotation: {page.rotation}°
                    </CardContent>
                    <CardFooter className="py-2 px-4 flex justify-between items-center">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleRotate(index, 'ccw')} disabled={page.isDeleted} title="Rotate Counter-Clockwise">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleRotate(index, 'cw')} disabled={page.isDeleted} title="Rotate Clockwise">
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleMovePage(index, 'up')} disabled={index === 0 || page.isDeleted} title="Move Up">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleMovePage(index, 'down')} disabled={index === pages.length - 1 || page.isDeleted} title="Move Down">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleResetChanges} disabled={isProcessing || isLoading}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Reset All Changes
                </Button>
                <Button onClick={handleOrganizeAndDownload} disabled={isProcessing || isLoading || !file || pages.filter(p => !p.isDeleted).length === 0}>
                {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Download className="mr-2 h-4 w-4" />
                )}
                Apply Changes & Download
                </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}