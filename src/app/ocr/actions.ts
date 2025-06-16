"use client";

// Polyfill for Promise.withResolvers if needed by pdfjs-dist client-side
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
import Tesseract, { createWorker } from 'tesseract.js';

import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScanText, Loader2, Info, Download, CheckSquare, Square, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { cn } from '@/lib/utils';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface PageToOcr {
  id: string;
  originalFileId: string;
  originalFileName: string;
  originalFileDataUri: string;
  pageIndexInOriginalFile: number;
  displayName: string;
  isSelected: boolean;
  extractedText: string | null;
  isProcessing: boolean;
  ocrProgress: number;
  error?: string | null;
}

const PREVIEW_TARGET_HEIGHT_OCR = 180;
const OCR_IMAGE_QUALITY = 0.9; // JPG quality for OCR
const OCR_IMAGE_SCALE = 2.5; // Scale factor for rendering page image for OCR

export default function OcrPdfPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pagesToOcr, setPagesToOcr] = useState<PageToOcr[]>([]);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();
  const [tesseractWorker, setTesseractWorker] = useState<Tesseract.Worker | null>(null);

  useEffect(() => {
    // Initialize Tesseract worker
    const initializeWorker = async () => {
      const worker = await createWorker({
        logger: m => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            const activePage = pagesToOcr.find(p => p.isProcessing && !p.extractedText);
            if (activePage) {
              setPagesToOcr(prev => prev.map(p => p.id === activePage.id ? {...p, ocrProgress: Math.round(m.progress * 100)} : p));
            }
          }
        },
        // Optional: Specify paths if not using CDN for worker/core/lang data
        // workerPath: '/path/to/tesseract/worker.min.js',
        // corePath: '/path/to/tesseract/tesseract-core.wasm.js',
        // langPath: '/path/to/lang-data/'
      });
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      setTesseractWorker(worker);
    };
    initializeWorker();

    return () => {
      tesseractWorker?.terminate();
    };
  }, []); // Runs once on mount

  const processUploadedPdf = async (file: File) => {
    setIsLoadingPdf(true);
    setGlobalError(null);
    setPagesToOcr([]);
    setPdfFile(file);

    try {
      const dataUri = await readFileAsDataURL(file);
      setPdfDataUri(dataUri);

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
      const numPages = pdfDoc.numPages;
      const newPages: PageToOcr[] = [];

      for (let i = 0; i < numPages; i++) {
        newPages.push({
          id: crypto.randomUUID(),
          originalFileId: crypto.randomUUID(),
          originalFileName: file.name,
          originalFileDataUri: dataUri,
          pageIndexInOriginalFile: i,
          displayName: `Page ${i + 1}`,
          isSelected: true,
          extractedText: null,
          isProcessing: false,
          ocrProgress: 0,
        });
      }
      setPagesToOcr(newPages);
      if (typeof (pdfDoc as any).destroy === 'function') {
        await (pdfDoc as any).destroy();
      }
    } catch (e: any) {
      console.error("Error processing PDF for OCR:", file.name, e);
      setGlobalError(e.message || "Failed to load PDF.");
      toast({ title: "PDF Load Error", description: e.message, variant: "destructive" });
      setPdfFile(null);
      setPdfDataUri(null);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      processUploadedPdf(selectedFiles[0]);
    } else {
      setPdfFile(null);
      setPdfDataUri(null);
      setPagesToOcr([]);
      setGlobalError(null);
    }
  };

  const togglePageSelection = (pageId: string) => {
    setPagesToOcr(prev =>
      prev.map(p => (p.id === pageId ? { ...p, isSelected: !p.isSelected } : p))
    );
  };

  const toggleSelectAllPages = () => {
    const allSelected = pagesToOcr.every(p => p.isSelected);
    setPagesToOcr(prev => prev.map(p => ({ ...p, isSelected: !allSelected })));
  };

  const convertPageToImageDataUri = async (
    pageData: PageToOcr,
    quality: number,
    scale: number
  ): Promise<string> => {
    if (!pageData.originalFileDataUri) throw new Error("Missing PDF data URI for page.");

    const base64Marker = ';base64,';
    const base64Index = pageData.originalFileDataUri.indexOf(base64Marker);
    if (base64Index === -1) throw new Error('Invalid PDF data URI format.');
    const pdfBase64Data = pageData.originalFileDataUri.substring(base64Index + base64Marker.length);
    const pdfBinaryData = atob(pdfBase64Data);
    const pdfDataArray = new Uint8Array(pdfBinaryData.length);
    for (let i = 0; i < pdfBinaryData.length; i++) {
      pdfDataArray[i] = pdfBinaryData.charCodeAt(i);
    }
    
    let pdfDoc: PDFDocumentProxy | null = null;
    let page: PDFPageProxy | null = null;
    try {
        pdfDoc = await pdfjsLib.getDocument({ data: pdfDataArray }).promise;
        page = await pdfDoc.getPage(pageData.pageIndexInOriginalFile + 1);
        
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get 2D context.');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext: RenderParameters = { canvasContext: context, viewport: viewport };
        await page.render(renderContext).promise;
        
        return canvas.toDataURL('image/jpeg', quality);
    } finally {
        if (page && typeof page.cleanup === 'function') page.cleanup();
        if (pdfDoc && typeof (pdfDoc as any).destroy === 'function') await (pdfDoc as any).destroy();
    }
  };

  const handleExtractText = async () => {
    const selectedPages = pagesToOcr.filter(p => p.isSelected);
    if (selectedPages.length === 0) {
      toast({ title: "No Pages Selected", description: "Please select at least one page to process.", variant: "destructive" });
      return;
    }
    if (!tesseractWorker) {
      toast({ title: "OCR Not Ready", description: "Tesseract.js worker is not initialized. Please wait.", variant: "destructive" });
      return;
    }

    setIsProcessingOcr(true);
    setGlobalError(null);
    
    for (const page of selectedPages) {
      setPagesToOcr(prev => prev.map(p => (p.id === page.id ? { ...p, isProcessing: true, error: null, extractedText: null, ocrProgress: 0 } : p)));
      try {
        const imageDataUri = await convertPageToImageDataUri(page, OCR_IMAGE_QUALITY, OCR_IMAGE_SCALE);
        const { data: { text } } = await tesseractWorker.recognize(imageDataUri);
        
        setPagesToOcr(prev =>
          prev.map(p => (p.id === page.id ? { ...p, extractedText: text || "No text detected.", isProcessing: false, ocrProgress: 100 } : p))
        );
      } catch (e: any) {
        console.error(`Error OCRing page ${page.displayName}:`, e);
        setPagesToOcr(prev =>
          prev.map(p => (p.id === page.id ? { ...p, error: e.message || "OCR failed", isProcessing: false, ocrProgress: 0 } : p))
        );
      }
    }
    setIsProcessingOcr(false);
    toast({ title: "OCR Process Completed", description: "Text extraction attempt finished for selected pages." });
  };

  const handleDownloadText = () => {
    const allText = pagesToOcr
      .filter(p => p.extractedText)
      .map(p => `--- Page ${p.pageIndexInOriginalFile + 1} ---\n${p.extractedText}\n\n`)
      .join('');

    if (!allText.trim()) {
      toast({ title: "No Text to Download", description: "No text has been extracted yet.", variant: "destructive" });
      return;
    }
    const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' });
    const dataUri = URL.createObjectURL(blob);
    downloadDataUri(dataUri, `${pdfFile?.name.replace(/\.pdf$/i, '') || 'ocr_results'}.txt`);
    URL.revokeObjectURL(dataUri); 
    toast({ title: "Text Downloaded", description: "Extracted text has been downloaded." });
  };
  
  const allPagesSelected = pagesToOcr.length > 0 && pagesToOcr.every(p => p.isSelected);
  const selectedCount = pagesToOcr.filter(p => p.isSelected).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center py-8">
        <BrainCircuit className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">OCR PDF (Extract Text Locally)</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Upload a PDF. The tool will convert pages to images and use client-side Tesseract.js to extract text in your browser.
          No API key needed.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>1. Upload PDF</CardTitle>
          <CardDescription>Select the PDF file you want to process for OCR.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
        </CardContent>
      </Card>

      {globalError && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" /> <AlertTitle>Error</AlertTitle>
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      {isLoadingPdf && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Loading PDF pages...</p>
        </div>
      )}

      {!tesseractWorker && !isLoadingPdf && !pdfFile && (
        <Alert variant="default" className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
            <AlertTitle>Initializing OCR Engine</AlertTitle>
            <AlertDescription>Please wait while Tesseract.js (the local OCR engine) loads. This might take a moment on first visit.</AlertDescription>
        </Alert>
      )}


      {pagesToOcr.length > 0 && !isLoadingPdf && (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>2. Select Pages & Extract Text ({selectedCount} / {pagesToOcr.length} selected)</span>
                <Button variant="outline" onClick={toggleSelectAllPages} size="sm" disabled={isProcessingOcr}>
                  {allPagesSelected ? <CheckSquare className="mr-2 h-4 w-4"/> : <Square className="mr-2 h-4 w-4"/>}
                  {allPagesSelected ? 'Deselect All' : 'Select All'}
                </Button>
              </CardTitle>
              <CardDescription>
                Choose the pages you want to extract text from. Click "Extract Text" to begin processing locally.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] border rounded-md p-2 bg-muted/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-2">
                  {pagesToOcr.map((page) => (
                    <Card key={page.id} className={cn("overflow-hidden", page.isSelected && "ring-2 ring-primary")}>
                      <CardHeader className="p-3">
                        <div className="flex items-center justify-between">
                           <Label htmlFor={`select-${page.id}`} className="flex items-center space-x-2 cursor-pointer">
                                <Checkbox
                                id={`select-${page.id}`}
                                checked={page.isSelected}
                                onCheckedChange={() => togglePageSelection(page.id)}
                                disabled={isProcessingOcr || page.isProcessing}
                                />
                                <span className="font-medium text-sm">{page.displayName}</span>
                           </Label>
                           {page.isProcessing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <PdfPagePreview
                          pdfDataUri={page.originalFileDataUri}
                          pageIndex={page.pageIndexInOriginalFile}
                          targetHeight={PREVIEW_TARGET_HEIGHT_OCR}
                          className="border rounded mb-2"
                        />
                        {page.isProcessing && page.ocrProgress > 0 && page.ocrProgress < 100 && (
                           <div className="text-xs text-primary text-center">Processing: {page.ocrProgress}%</div>
                        )}
                        {page.extractedText && !page.isProcessing && (
                          <ScrollArea className="h-24 w-full rounded-md border p-2 text-xs bg-background">
                            <pre className="whitespace-pre-wrap break-words">{page.extractedText}</pre>
                          </ScrollArea>
                        )}
                        {page.error && !page.isProcessing && (
                            <Alert variant="destructive" className="text-xs p-2">
                                <Info className="h-3 w-3"/>
                                <AlertDescription>{page.error}</AlertDescription>
                            </Alert>
                        )}
                         {page.extractedText === "" && !page.isProcessing && !page.error && (
                            <p className="text-xs text-muted-foreground p-2 border rounded text-center bg-background/50">No text detected or extracted.</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex-col items-stretch space-y-3">
              <Button
                onClick={handleExtractText}
                disabled={isProcessingOcr || selectedCount === 0 || !tesseractWorker}
                className="w-full"
                size="lg"
              >
                {isProcessingOcr ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ScanText className="mr-2 h-5 w-5" />
                )}
                Extract Text from Selected Pages ({selectedCount})
              </Button>
              <Button
                onClick={handleDownloadText}
                variant="outline"
                className="w-full"
                disabled={isProcessingOcr || pagesToOcr.every(p => !p.extractedText)}
              >
                <Download className="mr-2 h-4 w-4" /> Download All Extracted Text
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}