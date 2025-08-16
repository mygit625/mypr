
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
import { ocrImageAction } from './actions'; 

import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScanText, Loader2, Info, Download, CheckSquare, Square, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
  error?: string | null;
}

const PREVIEW_TARGET_HEIGHT_OCR = 180;
const OCR_IMAGE_QUALITY = 0.9; 
const OCR_IMAGE_SCALE = 2.0; 

export default function OcrPdfPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pagesToOcr, setPagesToOcr] = useState<PageToOcr[]>([]);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrCompleted, setOcrCompleted] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setPdfFile(null);
    setPdfDataUri(null);
    setPagesToOcr([]);
    setGlobalError(null);
    setOcrCompleted(false);
  };

  const processUploadedPdf = async (file: File) => {
    setIsLoadingPdf(true);
    setGlobalError(null);
    setPagesToOcr([]);
    setPdfFile(file);
    setOcrCompleted(false);

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
      resetState();
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

    setIsProcessingOcr(true);
    setOcrCompleted(false);
    setGlobalError(null);
    
    let hasSuccessfulExtraction = false;
    for (const page of selectedPages) {
      setPagesToOcr(prev => prev.map(p => (p.id === page.id ? { ...p, isProcessing: true, error: null, extractedText: null } : p)));
      try {
        const imageDataUri = await convertPageToImageDataUri(page, OCR_IMAGE_QUALITY, OCR_IMAGE_SCALE);
        const result = await ocrImageAction({ imageDataUri });
        
        if ('error' in result) {
          throw new Error(result.error);
        }

        setPagesToOcr(prev =>
          prev.map(p => (p.id === page.id ? { ...p, extractedText: result.text || "No text detected.", isProcessing: false } : p))
        );
        hasSuccessfulExtraction = true;
      } catch (e: any) {
        console.error(`Error OCRing page ${page.displayName}:`, e);
        setPagesToOcr(prev =>
          prev.map(p => (p.id === page.id ? { ...p, error: e.message || "OCR failed", isProcessing: false } : p))
        );
      }
    }
    setIsProcessingOcr(false);
    if (hasSuccessfulExtraction) {
        setOcrCompleted(true);
    }
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
        <ScanText className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">OCR PDF (AI-Powered)</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Upload a PDF. Pages will be converted to images and sent to an AI to extract text. 
          Requires an active internet connection and API setup for deployed versions.
        </p>
      </header>

      {!pdfFile && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>1. Upload PDF</CardTitle>
            <CardDescription>Select the PDF file you want to process for OCR.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
          </CardContent>
        </Card>
      )}

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
                Choose the pages you want to extract text from. Click "Extract Text" to begin AI processing.
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
              {ocrCompleted ? (
                <>
                  <Button onClick={handleDownloadText} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg">
                    <Download className="mr-2 h-5 w-5"/> Download All Extracted Text
                  </Button>
                  <Button onClick={resetState} className="w-full" variant="outline">
                    Process Another PDF
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleExtractText}
                  disabled={isProcessingOcr || selectedCount === 0}
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
              )}
            </CardFooter>
          </Card>
        </>
      )}

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Use the OCR PDF Tool</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your Scanned PDF</h3>
              <p className="text-muted-foreground">Select or drag your PDF file into the upload area. The tool will display previews of all pages in your document.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Select Pages & Extract</h3>
              <p className="text-muted-foreground">Choose the specific pages you want to extract text from. Click the "Extract Text" button to start the AI-powered OCR process.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Review and Download</h3>
              <p className="text-muted-foreground">The extracted text will appear below each page preview. Once complete, you can download all the text in a single, convenient .txt file.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="text-center mb-12">
            <HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg text-left">What is OCR and how does it work?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                OCR stands for Optical Character Recognition. It's a technology that converts different types of documents, such as scanned paper documents or PDF files, into editable and searchable data. Our tool uses advanced AI models to recognize text in the images of your PDF pages and extract it.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">How accurate is the text extraction?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                The accuracy is very high, especially for clear, high-quality scans with standard fonts. However, factors like poor image quality, handwritten text, or unusual fonts can affect the results. It's always a good idea to proofread the extracted text.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Can this tool handle handwritten text?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                While our AI is powerful, its primary strength is with printed or typed text. The accuracy for handwritten text can vary significantly based on the clarity and style of the writing. For best results, use documents with clear, printed text.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">Unlock the Content in Your Scanned Documents</h2>
            <p>Many important documents exist only as scans or images, locked away in a non-interactive PDF format. This makes it impossible to search for specific text, copy a paragraph, or edit the content. Our free online OCR PDF tool is designed to solve this problem by transforming your static, scanned PDFs into fully accessible text.</p>
            <h3>Why You Need to OCR Your PDFs</h3>
            <ul>
              <li><strong>Make Content Searchable:</strong> After using our OCR tool, you can easily search for keywords or phrases within your documents, saving you hours of manual searching.</li>
              <li><strong>Enable Copy and Paste:</strong> Effortlessly copy text from your PDFs to use in other applications, such as word processors, presentations, or spreadsheets.</li>
              <li><strong>Improve Accessibility:</strong> Converting image-based text to real text makes your documents accessible to screen readers, benefiting visually impaired users.</li>
              <li><strong>Archive and Index Digitally:</strong> Text-based documents are much easier to index and archive in digital document management systems, making your information more organized and retrievable.</li>
            </ul>
            <p>Our tool leverages the power of cutting-edge AI to provide high-accuracy text recognition. By simply uploading your file and selecting the pages, you can convert entire documents from static images into valuable, usable text. It's the essential step for digitizing your paper archives and making your image-only PDFs more powerful.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
