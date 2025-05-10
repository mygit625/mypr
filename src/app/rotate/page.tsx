
"use client";

import { useState, useCallback } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RotateCcw, RotateCw, Loader2, Info, Download, RefreshCcw, FileText } from 'lucide-react'; // Added FileText
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { getInitialPageDataAction, organizePdfAction, type PageData, type PageOperation } from '../organize/actions'; // Reusing actions from organize
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper to ensure rotation stays within 0, 90, 180, 270
const normalizeRotation = (angle: number): number => {
  let newAngle = angle % 360;
  if (newAngle < 0) newAngle += 360;
  // Snap to nearest 90 degree increment if somehow it's off, though UI should prevent this.
  if (![0, 90, 180, 270].includes(newAngle)) {
    newAngle = Math.round(newAngle / 90) * 90 % 360;
  }
  return newAngle;
};


export default function RotatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [originalPages, setOriginalPages] = useState<PageData[]>([]); 
  
  const [isLoading, setIsLoading] = useState(false); 
  const [isProcessing, setIsProcessing] = useState(false); 
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
          const initialPages = result.pages.map(p => ({...p, rotation: normalizeRotation(p.rotation), isDeleted: false }));
          setPages(initialPages);
          setOriginalPages(JSON.parse(JSON.stringify(initialPages))); 
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

  const updatePageRotation = (index: number, newRotation: number) => {
    setPages(currentPages => 
      currentPages.map((page, i) => 
        i === index ? { ...page, rotation: normalizeRotation(newRotation) } : page
      )
    );
  };

  const handleRotatePage = (index: number, direction: 'cw' | 'ccw') => {
    const page = pages[index];
    const newRotation = direction === 'cw' ? page.rotation + 90 : page.rotation - 90;
    updatePageRotation(index, newRotation);
  };

  const handleRotateAllPages = (direction: 'cw' | 'ccw') => {
    setPages(currentPages => 
      currentPages.map(page => {
        const newRotation = direction === 'cw' ? page.rotation + 90 : page.rotation - 90;
        return { ...page, rotation: normalizeRotation(newRotation) };
      })
    );
    toast({ description: `All pages rotated ${direction === 'cw' ? 'clockwise' : 'counter-clockwise'}.` });
  };

  const handleResetRotations = () => {
    setPages(JSON.parse(JSON.stringify(originalPages))); 
    toast({ title: "Rotations Reset", description: "Page rotations have been reset to their original state." });
  };

  const handleApplyAndDownload = async () => {
    if (!pdfDataUri || pages.length === 0) {
      toast({ title: "No PDF Loaded", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);

    // All pages are included, order is preserved, only rotation changes.
    const operations: PageOperation[] = pages.map(page => ({
      originalIndex: page.originalIndex,
      rotation: page.rotation,
    }));

    try {
      const result = await organizePdfAction({ pdfDataUri, operations }); // Reusing organizePdfAction
      if (result.error) {
        setError(result.error);
        toast({ title: "Rotation Error", description: result.error, variant: "destructive" });
      } else if (result.organizedPdfDataUri) {
        downloadDataUri(result.organizedPdfDataUri, `rotated_${file?.name || 'document.pdf'}`);
        toast({ title: "Rotation Successful!", description: "Your PDF has been rotated and download has started." });
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during rotation.");
      toast({ title: "Rotation Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <RotateCcw className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Rotate PDF Pages</h1>
        <p className="text-muted-foreground mt-2">
          Adjust the orientation of pages in your PDF document. Rotate individual pages or all pages at once.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>Select the PDF file whose pages you want to rotate.</CardDescription>
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
              <CardTitle>Manage Page Rotations</CardTitle>
              <CardDescription>Use the controls to rotate pages. Changes are applied when you click "Apply & Download".</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col sm:flex-row gap-2 justify-center">
                 <Button variant="outline" onClick={() => handleRotateAllPages('ccw')} disabled={isProcessing}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Rotate All Left
                  </Button>
                  <Button variant="outline" onClick={() => handleRotateAllPages('cw')} disabled={isProcessing}>
                    <RotateCw className="mr-2 h-4 w-4" /> Rotate All Right
                  </Button>
              </div>
              <ScrollArea className="h-[500px] p-1 border rounded-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pages.map((page, index) => (
                  <Card key={page.id} className="flex flex-col">
                    <CardHeader className="py-3 px-4">
                       <CardTitle className="text-md flex justify-between items-center">
                        <span>Page {page.originalIndex + 1}</span>
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-4 text-sm text-muted-foreground flex-grow">
                        Dimensions: {page.width.toFixed(0)}pt x {page.height.toFixed(0)}pt
                        <br />
                        Current Rotation: {page.rotation}°
                        <div
                            className="mt-2 bg-background flex items-center justify-center rounded border-2 border-dashed border-border text-muted-foreground overflow-hidden"
                            style={{
                                height: '120px',
                                maxWidth: '100%',
                                aspectRatio: page.width && page.height && page.height !== 0 ? `${page.width} / ${page.height}` : '1 / 1.414',
                                transform: `rotate(${page.rotation}deg)`,
                                margin: '0 auto'
                            }}
                            data-ai-hint="document page"
                        >
                           <div style={{ transform: `rotate(${-page.rotation}deg)` }} className="flex flex-col items-center justify-center text-xs p-1 text-center">
                                <FileText className="h-6 w-6 mb-1" />
                                <span>Page {page.originalIndex + 1}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="py-3 px-4 flex justify-center gap-2 items-center border-t">
                        <Button variant="outline" size="sm" onClick={() => handleRotatePage(index, 'ccw')} title="Rotate Counter-Clockwise">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleRotatePage(index, 'cw')} title="Rotate Clockwise">
                          <RotateCw className="h-4 w-4" />
                        </Button>
                    </CardFooter>
                  </Card>
                ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleResetRotations} disabled={isProcessing || isLoading}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Reset Rotations
                </Button>
                <Button onClick={handleApplyAndDownload} disabled={isProcessing || isLoading || !file}>
                {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Download className="mr-2 h-4 w-4" />
                )}
                Apply Rotations & Download
                </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}

