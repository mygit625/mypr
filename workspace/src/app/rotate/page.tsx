"use client";

import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { RotateCcw, RotateCw, Loader2, Info, Download, ArrowRight, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { rotateAllPagesAction } from '@/app/rotate/actions';
import { PageConfetti } from '@/components/ui/page-confetti';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface PageInfo {
  pageIndex: number;
}

const PREVIEW_TARGET_HEIGHT_ROTATE = 220;

export default function RotatePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [rotation, setRotation] = useState(0);
  
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setPdfDataUri(null);
    setPages([]);
    setRotation(0);
    setProcessedUri(null);
    setError(null);
    setShowConfetti(false);
  };

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      resetState();
      setFile(selectedFile);
      setIsLoadingPdf(true);
      try {
        const dataUri = await readFileAsDataURL(selectedFile);
        setPdfDataUri(dataUri);
        
        const pdfDoc: PDFDocumentProxy = await pdfjsLib.getDocument(dataUri).promise;
        const pageInfos = Array.from({ length: pdfDoc.numPages }, (_, i) => ({ pageIndex: i }));
        setPages(pageInfos);

      } catch (e: any) {
        toast({ title: "File Error", description: `Could not load PDF: ${e.message}`, variant: "destructive" });
        resetState();
      } finally {
        setIsLoadingPdf(false);
      }
    }
  };

  const handleRotate = (direction: 'cw' | 'ccw') => {
    const angle = direction === 'cw' ? 90 : -90;
    setRotation(prev => (prev + angle + 360) % 360);
  };

  const handleApplyRotation = async () => {
    if (!pdfDataUri || rotation === 0) {
      toast({ description: "No rotation to apply." });
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await rotateAllPagesAction({ 
        pdfDataUri: processedUri || pdfDataUri, 
        rotation: rotation
      });
      if (result.error) throw new Error(result.error);
      
      setProcessedUri(result.processedPdfDataUri!);
      setRotation(0); // Reset rotation since it's now applied
      setShowConfetti(true);
      toast({ title: "Rotation Applied!", description: "The PDF has been successfully rotated." });

    } catch (e: any) {
      toast({ title: `Error rotating PDF`, description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-8">
      <PageConfetti active={showConfetti} />
      <header className="text-center py-8">
        <RotateCcw className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Rotate PDF</h1>
        <p className="text-muted-foreground mt-2">
          Rotate all pages of your PDF document at once.
        </p>
      </header>

      {!file && (
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>Select or drag a PDF file to begin.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleFilesSelected} multiple={false} accept="application/pdf" />
          </CardContent>
        </Card>
      )}

      {isLoadingPdf && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Loading PDF...</p>
        </div>
      )}

      {file && pdfDataUri && pages.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-2/3">
            <ScrollArea className="h-[calc(100vh-280px)] p-1 border rounded-md bg-muted/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                {pages.map(page => (
                   <div key={page.pageIndex} className="flex flex-col items-center">
                    <PdfPagePreview
                      pdfDataUri={processedUri || pdfDataUri}
                      pageIndex={page.pageIndex}
                      rotation={rotation}
                      targetHeight={PREVIEW_TARGET_HEIGHT_ROTATE}
                      className="shadow-md"
                    />
                     <span className="text-sm mt-2 text-muted-foreground">Page {page.pageIndex + 1}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="lg:w-1/3 space-y-4 lg:sticky lg:top-24 self-start">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle>Rotation Options</CardTitle>
                <CardDescription>Rotate all pages left or right. Click "Apply" to save the changes to the file.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center gap-4">
                <Button onClick={() => handleRotate('ccw')} size="lg" variant="outline">
                  <RotateCcw className="mr-2 h-5 w-5"/> Rotate Left
                </Button>
                <Button onClick={() => handleRotate('cw')} size="lg" variant="outline">
                  <RotateCw className="mr-2 h-5 w-5"/> Rotate Right
                </Button>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button onClick={handleApplyRotation} disabled={isProcessing || rotation === 0} className="w-full" size="lg">
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Apply Rotation ({rotation}°)
                </Button>
                <Button onClick={() => downloadDataUri(processedUri || pdfDataUri, `rotated_${file.name}`)} className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
                 <Button onClick={resetState} className="w-full" variant="secondary">
                  <X className="mr-2 h-4 w-4" /> Start Over
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
