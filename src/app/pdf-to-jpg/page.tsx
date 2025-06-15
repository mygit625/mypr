
"use client";

// Polyfill for Promise.withResolvers
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import JSZip from 'jszip';

import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { getInitialPageDataAction, type PageData } from './actions';
import { FileImage, Loader2, Info, Download, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

const PREVIEW_TARGET_HEIGHT_PDF_TO_JPG = 180;

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [jpgQuality, setJpgQuality] = useState(0.9);
  const [imageScale, setImageScale] = useState(1.5);

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      setFile(selectedFile);
      setError(null);
      setPages([]);
      setPdfDataUri(null);
      setTotalPages(0);
      setIsLoadingPdf(true);
      try {
        const dataUri = await readFileAsDataURL(selectedFile);
        setPdfDataUri(dataUri);
        const result = await getInitialPageDataAction({ pdfDataUri: dataUri });
        if (result.error) {
          setError(result.error);
          toast({ title: "Error loading PDF", description: result.error, variant: "destructive" });
          setFile(null);
          setPdfDataUri(null);
        } else if (result.pages) {
          setPages(result.pages);
          setTotalPages(result.pages.length);
        }
      } catch (e: any) {
        setError(e.message || "Failed to read or process file for preview.");
        toast({ title: "File Error", description: e.message, variant: "destructive" });
        setFile(null);
        setPdfDataUri(null);
      } finally {
        setIsLoadingPdf(false);
      }
    } else {
      setFile(null);
      setPdfDataUri(null);
      setPages([]);
      setTotalPages(0);
    }
  };

  const handleConvertAndDownload = async () => {
    if (!pdfDataUri || !file) {
      toast({ title: "No PDF loaded", description: "Please upload a PDF file first.", variant: "destructive" });
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      const base64Marker = ';base64,';
      const base64Index = pdfDataUri.indexOf(base64Marker);
      if (base64Index === -1) throw new Error('Invalid PDF data URI format.');
      const pdfBase64Data = pdfDataUri.substring(base64Index + base64Marker.length);
      const pdfBinaryData = atob(pdfBase64Data);
      const pdfDataArray = new Uint8Array(pdfBinaryData.length);
      for (let i = 0; i < pdfBinaryData.length; i++) {
        pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
      }
      
      const pdfDoc: PDFDocumentProxy = await pdfjsLib.getDocument({ data: pdfDataArray }).promise;
      const numDocPages = pdfDoc.numPages;
      const zip = new JSZip();
      const originalFileName = file.name.replace(/\.pdf$/i, '');

      for (let i = 0; i < numDocPages; i++) {
        const page: PDFPageProxy = await pdfDoc.getPage(i + 1);
        const viewport = page.getViewport({ scale: imageScale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error(`Could not get 2D context for page ${i + 1}.`);

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext: RenderParameters = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
        
        const jpgDataUrl = canvas.toDataURL('image/jpeg', jpgQuality);
        const jpgBase64 = jpgDataUrl.split(',')[1];
        zip.file(`${originalFileName}_page_${i + 1}.jpg`, jpgBase64, { base64: true });
        page.cleanup();
      }
      
      if (typeof (pdfDoc as any).destroy === 'function') {
        await (pdfDoc as any).destroy();
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipReader = new FileReader();
      zipReader.onload = function(event) {
        if (event.target && typeof event.target.result === 'string') {
          downloadDataUri(event.target.result, `${originalFileName}_jpg_images.zip`);
          toast({ title: "Conversion Successful!", description: "JPG images zipped and download started." });
        } else {
            throw new Error("Failed to read ZIP blob as Data URI.");
        }
      };
      zipReader.onerror = function() {
        throw new Error("Error reading ZIP blob.");
      }
      zipReader.readAsDataURL(zipBlob);

    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during conversion.";
      setError(errorMessage);
      toast({ title: "Conversion Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="text-center py-8">
        <FileImage className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">PDF to JPG Converter</h1>
        <p className="text-muted-foreground mt-2">
          Convert all pages of your PDF document into high-quality JPG images.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-grow lg:w-2/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>Select the PDF file you want to convert to JPG images.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
            </CardContent>
          </Card>

          {isLoadingPdf && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading PDF for preview...</p>
            </div>
          )}

          {pdfDataUri && pages.length > 0 && !isLoadingPdf && (
            <Card>
              <CardHeader>
                <CardTitle>Page Previews ({totalPages} Pages)</CardTitle>
                <CardDescription>Visual representation of your PDF. All pages will be converted.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] border rounded-md p-2 bg-muted/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-3">
                    {pages.map((page) => (
                      <div key={`preview-${page.originalIndex}-${page.id}`} className="flex flex-col items-center p-2 border rounded-md bg-card shadow-sm">
                        <PdfPagePreview
                            pdfDataUri={pdfDataUri}
                            pageIndex={page.originalIndex}
                            rotation={page.rotation || 0}
                            targetHeight={PREVIEW_TARGET_HEIGHT_PDF_TO_JPG}
                            className="my-1"
                        />
                        <span className="text-xs mt-2 text-muted-foreground">Page {page.originalIndex + 1}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:w-1/3 space-y-6 lg:sticky lg:top-20 self-start">
          {pdfDataUri && totalPages > 0 && !isLoadingPdf && (
            <Card className="shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-semibold flex items-center justify-center">
                  <Settings2 className="mr-2 h-6 w-6" /> Conversion Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="quality-slider" className="mb-2 block">JPG Quality: <span className="font-bold text-primary">{jpgQuality.toFixed(1)}</span></Label>
                  <Slider
                    id="quality-slider"
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={[jpgQuality]}
                    onValueChange={(value) => setJpgQuality(value[0])}
                    disabled={isConverting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Lower values mean smaller file size but lower quality.</p>
                </div>
                <div>
                  <Label htmlFor="scale-slider" className="mb-2 block">Image Scale: <span className="font-bold text-primary">{imageScale.toFixed(1)}x</span></Label>
                  <Slider
                    id="scale-slider"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={[imageScale]}
                    onValueChange={(value) => setImageScale(value[0])}
                    disabled={isConverting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Determines output image dimensions (e.g., 2x = double size).</p>
                </div>
              </CardContent>
              <CardFooter className="mt-4 border-t pt-6">
                <Button
                  onClick={handleConvertAndDownload}
                  disabled={isConverting || isLoadingPdf}
                  className="w-full"
                  size="lg"
                >
                  {isConverting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Convert All Pages & Download ZIP
                </Button>
              </CardFooter>
            </Card>
          )}
          {!pdfDataUri && !isLoadingPdf && (
             <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Upload a PDF</AlertTitle>
                <AlertDescription>
                  Please upload a PDF file to enable conversion options.
                </AlertDescription>
              </Alert>
          )}
        </div>
      </div>

      {error && !isConverting && (
        <Alert variant="destructive" className="mt-6 max-w-xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
