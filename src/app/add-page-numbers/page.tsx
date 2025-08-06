
"use client";

// Polyfill for Promise.withResolvers if needed
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


import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListOrdered, Loader2, Info, ArrowRightCircle, Check, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { addPageNumbersAction, type PageNumberPosition } from '@/app/add-page-numbers/actions';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface PageInfo {
  pageIndex: number;
}

const PREVIEW_TARGET_HEIGHT_PAGENUM = 250;

export default function AddPageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [position, setPosition] = useState<PageNumberPosition>('bottom-center');
  const [pageRange, setPageRange] = useState('');
  const [textFormat, setTextFormat] = useState('{n}');
  const [formatPreset, setFormatPreset] = useState('{n}');
  const [fontSize, setFontSize] = useState(12);
  const [startingNumber, setStartingNumber] = useState(1);

  const resetState = () => {
    setFile(null);
    setPdfDataUri(null);
    setPages([]);
    setError(null);
    setProcessedUri(null);
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
        const pageInfos = Array.from({ length: numPages }, (_, i) => ({ pageIndex: i }));
        setPages(pageInfos);

        if (numPages > 0) {
          setPageRange(`1-${numPages}`);
        }
      } catch (e: any) {
        setError(e.message || "Failed to read or process file.");
        toast({ title: "File Error", description: e.message, variant: "destructive" });
        resetState();
      } finally {
        setIsLoadingPdf(false);
      }
    } else {
      resetState();
    }
  };

  const handleAddNumbers = async () => {
    if (!file || !pdfDataUri) {
      toast({ title: "No file selected", description: "Please select a PDF file.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessedUri(null);

    try {
      const result = await addPageNumbersAction({
        pdfDataUri, position, pageRange, textFormat, fontSize, startingNumber,
      });

      if (result.error) {
        setError(result.error);
        toast({ title: "Processing Error", description: result.error, variant: "destructive" });
      } else if (result.numberedPdfDataUri) {
        setProcessedUri(result.numberedPdfDataUri);
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      toast({ title: "Processing Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDownload = () => {
    if(processedUri && file) {
      downloadDataUri(processedUri, `numbered_${file.name}`);
    }
  };

  const positionOptions: { value: PageNumberPosition; label: string; gridClass: string }[] = [
    { value: 'top-left', label: 'Top Left', gridClass: 'col-start-1 row-start-1' },
    { value: 'top-center', label: 'Top Center', gridClass: 'col-start-2 row-start-1' },
    { value: 'top-right', label: 'Top Right', gridClass: 'col-start-3 row-start-1' },
    { value: 'bottom-left', label: 'Bottom Left', gridClass: 'col-start-1 row-start-2' },
    { value: 'bottom-center', label: 'Bottom Center', gridClass: 'col-start-2 row-start-2' },
    { value: 'bottom-right', label: 'Bottom Right', gridClass: 'col-start-3 row-start-2' },
  ];

  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <ListOrdered className="mx-auto h-12 w-12 text-primary mb-3" />
        <h1 className="text-4xl font-bold tracking-tight">Add Page Numbers to PDF</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Easily insert page numbers into your PDF document with various customization options.
        </p>
      </header>
      
      {!file && (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Upload PDF</CardTitle>
                <CardDescription>Select or drag a PDF file to begin.</CardDescription>
            </CardHeader>
            <CardContent>
                <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
            </CardContent>
        </Card>
      )}

      {isLoadingPdf && (
        <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading PDF...</span>
        </div>
      )}

      {file && pdfDataUri && pages.length > 0 && !isLoadingPdf && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content: Page grid */}
          <div className="lg:w-2/3">
            <ScrollArea className="h-[calc(100vh-250px)] w-full border rounded-lg bg-muted/20 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pages.map(p => (
                   <div key={p.pageIndex} className="flex flex-col items-center">
                    <PdfPagePreview
                      pdfDataUri={processedUri || pdfDataUri}
                      pageIndex={p.pageIndex}
                      targetHeight={PREVIEW_TARGET_HEIGHT_PAGENUM}
                      className="shadow-md"
                    />
                    <span className="text-sm text-muted-foreground mt-2">Page {p.pageIndex + 1}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Options & Action */}
          <div className="lg:w-1/3 space-y-6 lg:sticky lg:top-24 self-start">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Page Number Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Position</Label>
                  <div className="grid grid-cols-3 grid-rows-2 gap-1.5 w-24 h-16 bg-muted/50 p-1 rounded-md mt-1">
                      {positionOptions.map(opt => (
                          <button
                              key={opt.value}
                              onClick={() => setPosition(opt.value)}
                              className={cn(
                                  'rounded-sm hover:bg-primary/20 transition-colors flex items-center justify-center',
                                  opt.gridClass,
                                  position === opt.value ? 'bg-primary/80' : 'bg-primary/10'
                              )}
                              title={opt.label}
                          >
                            {position === opt.value && <Check className="h-4 w-4 text-primary-foreground" />}
                          </button>
                      ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="page-range">Pages to number</Label>
                  <Input
                    id="page-range"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g., 1-5, 8, 10-12"
                    disabled={!file || !!processedUri}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave blank to number all pages.</p>
                </div>

                <div>
                  <Label htmlFor="text-format-select">Text format</Label>
                  <Select
                    value={formatPreset}
                    onValueChange={(value) => {
                      setFormatPreset(value);
                      if (value !== 'custom') {
                        setTextFormat(value);
                      }
                    }}
                    disabled={!file || !!processedUri}
                  >
                    <SelectTrigger id="text-format-select">
                      <SelectValue placeholder="Select a format..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="{n}">Insert only page number (recommended)</SelectItem>
                      <SelectItem value="Page {n}">{'Page {n}'}</SelectItem>
                      <SelectItem value="Page {n} of {N}">{'Page {n} of {N}'}</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {formatPreset === 'custom' && (
                    <Input
                      id="text-format-custom"
                      value={textFormat}
                      onChange={(e) => setTextFormat(e.target.value)}
                      className="mt-2"
                      disabled={!file || !!processedUri}
                    />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Use {'{n}'} for page number and {'{N}'} for total pages.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="starting-number">First number</Label>
                      <Input
                        id="starting-number"
                        type="number"
                        value={startingNumber}
                        onChange={(e) => setStartingNumber(Number(e.target.value))}
                        min={1}
                        disabled={!file || !!processedUri}
                      />
                  </div>
                  <div>
                      <Label htmlFor="font-size">Font size: {fontSize}pt</Label>
                      <Slider
                        id="font-size"
                        min={8} max={72} step={1}
                        value={[fontSize]}
                        onValueChange={(value) => setFontSize(value[0])}
                        disabled={!file || !!processedUri}
                      />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                 {processedUri ? (
                    <>
                    <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg">
                        <Download className="mr-2 h-5 w-5"/> Download PDF
                    </Button>
                     <Button onClick={resetState} className="w-full" variant="outline">
                        Process Another File
                    </Button>
                    </>
                ) : (
                    <Button
                    onClick={handleAddNumbers}
                    disabled={!file || isProcessing}
                    className="w-full text-lg py-6"
                    size="lg"
                    >
                    {isProcessing ? (
                        <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Adding Numbers...
                        </>
                    ) : (
                        <>
                        <ArrowRightCircle className="mr-2 h-5 w-5" />
                        Add page numbers
                        </>
                    )}
                    </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
      
      {error && !isLoadingPdf && (
        <Alert variant="destructive" className="mt-6 max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
