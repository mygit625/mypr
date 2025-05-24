
"use client";

import { useState, useEffect } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { getInitialPageDataAction, type PageData } from '../organize/actions'; // Reusing from organize
import {
  SplitSquareHorizontal, Loader2, Info, CheckCircle,
  GalleryThumbnails, Files, Scaling, PlusCircle, XCircle, ArrowRightCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { splitPdfAction, type CustomRange } from './actions';
import { cn } from '@/lib/utils';

const PREVIEW_TARGET_HEIGHT = 150;

type SplitMode = 'range' | 'pages' | 'size';
type RangeMode = 'custom' | 'fixed';

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [splitMode, setSplitMode] = useState<SplitMode>('range');
  const [rangeMode, setRangeMode] = useState<RangeMode>('custom');
  const [customRanges, setCustomRanges] = useState<CustomRange[]>([{ from: 1, to: 1 }]);

  useEffect(() => {
    // When PDF is loaded, update the default range to cover all pages or first page
    if (totalPages > 0 && customRanges.length === 1 && customRanges[0].from === 1 && customRanges[0].to === 1) {
      setCustomRanges([{ from: 1, to: totalPages > 0 ? totalPages : 1 }]);
    }
  }, [totalPages, customRanges]);


  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      setFile(selectedFile);
      setError(null);
      setPages([]);
      setPdfDataUri(null);
      setTotalPages(0);
      setCustomRanges([{ from: 1, to: 1 }]);
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
           // Update default range once total pages are known
          if (result.pages.length > 0) {
            setCustomRanges([{ from: 1, to: result.pages.length }]);
          } else {
            setCustomRanges([{ from: 1, to: 1 }]);
          }
        }
      } catch (e: any) {
        setError(e.message || "Failed to read or process file.");
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
      setCustomRanges([{ from: 1, to: 1 }]);
    }
  };

  const handleAddRange = () => {
    setCustomRanges([...customRanges, { from: 1, to: totalPages > 0 ? totalPages : 1 }]);
  };

  const handleRemoveRange = (index: number) => {
    setCustomRanges(customRanges.filter((_, i) => i !== index));
  };

  const handleRangeChange = (index: number, field: 'from' | 'to', value: string) => {
    const numValue = parseInt(value, 10);
    const newRanges = [...customRanges];
    if (!isNaN(numValue) && numValue >=1 && numValue <= totalPages) {
        newRanges[index] = { ...newRanges[index], [field]: numValue };

        // Basic validation: ensure 'to' is not less than 'from'
        if (field === 'from' && numValue > newRanges[index].to) {
            newRanges[index].to = numValue;
        }
        if (field === 'to' && numValue < newRanges[index].from) {
            newRanges[index].from = numValue;
        }
        setCustomRanges(newRanges);
    } else if (value === '') { // Allow clearing the input
        newRanges[index] = { ...newRanges[index], [field]: 1 }; // Reset to 1 or handle as empty
        setCustomRanges(newRanges);
    }
  };

  const handleSplit = async () => {
    if (!file || !pdfDataUri) {
      toast({ title: "No file selected", description: "Please select a PDF file to split.", variant: "destructive" });
      return;
    }
    if (splitMode === 'range' && rangeMode === 'custom') {
      if (customRanges.some(r => r.from > r.to || r.from < 1 || r.to > totalPages)) {
        toast({ title: "Invalid Range", description: "One or more ranges are invalid. Please check page numbers.", variant: "destructive"});
        return;
      }
    }

    setIsSplitting(true);
    setError(null);

    try {
      let result;
      if (splitMode === 'range' && rangeMode === 'custom') {
        result = await splitPdfAction({ pdfDataUri, splitType: 'ranges', ranges: customRanges });
      } else {
        // Fallback to splitting all pages if other modes not implemented
        result = await splitPdfAction({ pdfDataUri, splitType: 'allPages' });
      }

      if (result.error) {
        setError(result.error);
        toast({ title: "Split Error", description: result.error, variant: "destructive" });
      } else if (result.zipDataUri) {
        downloadDataUri(result.zipDataUri, `${file.name.replace(/\.pdf$/i, '')}_split.zip`);
        toast({ title: "Split Successful!", description: "Your PDF has been split and download has started." });
        // Optionally reset file selection:
        // setFile(null); setPdfDataUri(null); setPages([]); setTotalPages(0); setCustomRanges([{ from: 1, to: 1 }]);
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during split.";
      setError(errorMessage);
      toast({ title: "Split Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSplitting(false);
    }
  };

  const currentSplitActionLabel = () => {
    if (splitMode === 'range' && rangeMode === 'custom') return "Split by Custom Ranges";
    return "Split PDF";
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="text-center">
        <SplitSquareHorizontal className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Split PDF File</h1>
        <p className="text-muted-foreground mt-2">
          Divide your PDF into multiple documents by specifying page ranges.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel: File Upload and Previews */}
        <div className="flex-grow lg:w-2/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>Select or drag and drop the PDF file you want to split.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
            </CardContent>
          </Card>

          {isLoadingPdf && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading PDF pages...</p>
            </div>
          )}

          {pdfDataUri && pages.length > 0 && !isLoadingPdf && (
            <Card>
              <CardHeader>
                <CardTitle>Page Previews ({totalPages} Pages)</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] border rounded-md p-2 bg-muted/30">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {pages.map((page, index) => (
                      <div key={`preview-${page.originalIndex}`} className="flex flex-col items-center">
                         <div className="w-full aspect-[210/297] bg-white border rounded-sm overflow-hidden flex items-center justify-center">
                            <PdfPagePreview
                                pdfDataUri={pdfDataUri}
                                pageIndex={page.originalIndex}
                                rotation={0} // No rotation in split preview generally
                                targetHeight={PREVIEW_TARGET_HEIGHT}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                        <span className="text-xs mt-1 text-muted-foreground">Page {page.originalIndex + 1}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel: Split Options */}
        <div className="lg:w-1/3 space-y-6 lg:sticky lg:top-20 self-start">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-semibold">Split Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={splitMode} onValueChange={(val) => setSplitMode(val as SplitMode)} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="range" className="text-xs sm:text-sm"><GalleryThumbnails className="mr-1 h-4 w-4" />Range</TabsTrigger>
                  <TabsTrigger value="pages" disabled><Files className="mr-1 h-4 w-4" />Pages</TabsTrigger>
                  <TabsTrigger value="size" disabled><Scaling className="mr-1 h-4 w-4" />Size</TabsTrigger>
                </TabsList>
                <TabsContent value="range" className="pt-4">
                  <Label className="text-sm font-medium">Range mode:</Label>
                  <div className="flex gap-2 mt-1 mb-4">
                    <Button
                      variant={rangeMode === 'custom' ? 'default' : 'outline'}
                      onClick={() => setRangeMode('custom')}
                      className="flex-1"
                    >
                      Custom ranges
                    </Button>
                    <Button
                      variant={rangeMode === 'fixed' ? 'default' : 'outline'}
                      onClick={() => setRangeMode('fixed')}
                      disabled
                      className="flex-1"
                    >
                      Fixed ranges
                    </Button>
                  </div>

                  {rangeMode === 'custom' && (
                    <div className="space-y-3">
                      {customRanges.map((range, idx) => (
                        <Card key={idx} className="p-3 bg-muted/30">
                          <div className="flex justify-between items-center mb-2">
                            <Label htmlFor={`from-${idx}`} className="text-sm font-medium">Range {idx + 1}</Label>
                            {customRanges.length > 1 && (
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveRange(idx)} className="h-7 w-7">
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3 items-end">
                            <div>
                              <Label htmlFor={`from-${idx}`} className="text-xs">From page</Label>
                              <Input
                                id={`from-${idx}`}
                                type="number"
                                value={range.from}
                                onChange={(e) => handleRangeChange(idx, 'from', e.target.value)}
                                min={1}
                                max={totalPages}
                                className="h-9"
                                disabled={!file || totalPages === 0}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`to-${idx}`} className="text-xs">To</Label>
                              <Input
                                id={`to-${idx}`}
                                type="number"
                                value={range.to}
                                onChange={(e) => handleRangeChange(idx, 'to', e.target.value)}
                                min={range.from}
                                max={totalPages}
                                className="h-9"
                                disabled={!file || totalPages === 0}
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                      <Button variant="outline" onClick={handleAddRange} disabled={!file || totalPages === 0} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Range
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="mt-4">
              <Button
                onClick={handleSplit}
                disabled={!file || isSplitting || isLoadingPdf || (splitMode === 'range' && rangeMode === 'custom' && customRanges.length === 0)}
                className="w-full"
                size="lg"
              >
                {isSplitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <SplitSquareHorizontal className="mr-2 h-4 w-4" />
                )}
                {currentSplitActionLabel()}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Success message handled by toast */}

    </div>
  );
}
