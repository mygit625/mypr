
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
  SplitSquareHorizontal, Loader2, Info,
  GalleryThumbnails, Files, Scaling, PlusCircle, XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { splitPdfAction, type CustomRange } from './actions';
import { cn } from '@/lib/utils';

const PREVIEW_TARGET_HEIGHT_SPLIT = 200; // Increased height for better visibility

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
        setPdfDataUri(dataUri); // Set URI first
        const result = await getInitialPageDataAction({ pdfDataUri: dataUri });
        if (result.error) {
          setError(result.error);
          toast({ title: "Error loading PDF", description: result.error, variant: "destructive" });
          setFile(null);
          setPdfDataUri(null);
        } else if (result.pages) {
          setPages(result.pages);
          setTotalPages(result.pages.length);
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
        if (field === 'from' && numValue > newRanges[index].to) {
            newRanges[index].to = numValue;
        }
        if (field === 'to' && numValue < newRanges[index].from) {
            newRanges[index].from = numValue;
        }
        setCustomRanges(newRanges);
    } else if (value === '') { 
        newRanges[index] = { ...newRanges[index], [field]: 1 }; 
        setCustomRanges(newRanges);
    }
  };

  const handleSplit = async () => {
    if (!file || !pdfDataUri) {
      toast({ title: "No file selected", description: "Please select a PDF file to split.", variant: "destructive" });
      return;
    }
    if (splitMode === 'range' && rangeMode === 'custom') {
      const validRanges = customRanges.filter(r => r.from >= 1 && r.to >= r.from && r.to <= totalPages);
      if (validRanges.length === 0 || validRanges.length !== customRanges.length) {
        toast({ title: "Invalid Range", description: "One or more ranges are invalid or out of bounds. Please check page numbers.", variant: "destructive"});
        return;
      }
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
        // Filter out potentially empty or invalid ranges again before sending to action
        const validRangesForAction = customRanges.filter(r => r.from >=1 && r.to >= r.from && r.to <= totalPages);
        if (validRangesForAction.length === 0) {
             toast({ title: "No Valid Ranges", description: "Please define at least one valid range.", variant: "destructive"});
             setIsSplitting(false);
             return;
        }
        result = await splitPdfAction({ pdfDataUri, splitType: 'ranges', ranges: validRangesForAction });
      } else {
        // Default to splitting all pages if 'range' 'custom' is not the mode (though UI limits this now)
        result = await splitPdfAction({ pdfDataUri, splitType: 'allPages' });
      }

      if (result.error) {
        setError(result.error);
        toast({ title: "Split Error", description: result.error, variant: "destructive" });
      } else if (result.zipDataUri) {
        downloadDataUri(result.zipDataUri, `${file.name.replace(/\.pdf$/i, '')}_split.zip`);
        toast({ title: "Split Successful!", description: "Your PDF has been split and download has started." });
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
    return "Split PDF"; // Default or fallback label
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="text-center">
        <SplitSquareHorizontal className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Split PDF File</h1>
        <p className="text-muted-foreground mt-2">
          Divide your PDF into multiple documents by specifying page ranges or extracting all pages.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
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
                <ScrollArea className="h-[600px] border rounded-md p-2 bg-muted/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 p-3">
                    {pages.map((page) => (
                      <div key={`preview-${page.originalIndex}-${page.id}`} className="flex flex-col items-center p-2 border rounded-md bg-card shadow-sm">
                        <PdfPagePreview
                            pdfDataUri={pdfDataUri}
                            pageIndex={page.originalIndex}
                            rotation={0} 
                            targetHeight={PREVIEW_TARGET_HEIGHT_SPLIT}
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
           {pdfDataUri && pages.length === 0 && !isLoadingPdf && !error &&(
             <Alert variant="default">
                <Info className="h-4 w-4"/>
                <AlertTitle>No Pages Found</AlertTitle>
                <AlertDescription>The uploaded PDF appears to have no pages or could not be processed for page previews.</AlertDescription>
             </Alert>
           )}
        </div>

        <div className="lg:w-1/3 space-y-6 lg:sticky lg:top-20 self-start">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-semibold">Split Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="range" value={splitMode} onValueChange={(val) => setSplitMode(val as SplitMode)} className="w-full">
                <TabsList className="grid w-full grid-cols-1"> {/* Simplified to one active option for now */}
                  <TabsTrigger value="range" className="text-xs sm:text-sm"><GalleryThumbnails className="mr-1 h-4 w-4" />By Range</TabsTrigger>
                  {/* <TabsTrigger value="pages" disabled><Files className="mr-1 h-4 w-4" />Extract Pages</TabsTrigger>
                  <TabsTrigger value="size" disabled><Scaling className="mr-1 h-4 w-4" />By Size</TabsTrigger> */}
                </TabsList>
                <TabsContent value="range" className="pt-4">
                   <div className="mb-4">
                     <Label className="text-sm font-medium block mb-2">Mode:</Label>
                      <Button
                        variant={rangeMode === 'custom' ? 'default' : 'outline'}
                        onClick={() => setRangeMode('custom')}
                        className="w-full"
                        disabled={!file || totalPages === 0}
                      >
                        Define Custom Ranges
                      </Button>
                      {/* Button for "Split All Pages" could be added here if needed outside "custom ranges" */}
                   </div>


                  {rangeMode === 'custom' && (
                    <div className="space-y-3">
                      <Alert variant="default" className="text-sm">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Define one or more page ranges. Each range will be saved as a separate PDF.
                          Example: From 1 to 5, From 8 to 10.
                        </AlertDescription>
                      </Alert>
                      {customRanges.map((range, idx) => (
                        <Card key={idx} className="p-3 bg-muted/25">
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
                                placeholder="e.g. 1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`to-${idx}`} className="text-xs">To page</Label>
                              <Input
                                id={`to-${idx}`}
                                type="number"
                                value={range.to}
                                onChange={(e) => handleRangeChange(idx, 'to', e.target.value)}
                                min={range.from}
                                max={totalPages}
                                className="h-9"
                                disabled={!file || totalPages === 0}
                                placeholder={`e.g. ${totalPages || 1}`}
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                      <Button variant="outline" onClick={handleAddRange} disabled={!file || totalPages === 0} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Another Range
                      </Button>
                    </div>
                  )}
                  {/* Placeholder for 'fixed' range mode if implemented later */}
                </TabsContent>
              </Tabs>
               <Button
                variant="secondary"
                onClick={async () => { // Action for "Split All Pages"
                    if (!file || !pdfDataUri) {
                        toast({ title: "No file selected", variant: "destructive" });
                        return;
                    }
                    setIsSplitting(true); setError(null);
                    try {
                        const result = await splitPdfAction({ pdfDataUri, splitType: 'allPages' });
                        if (result.error) {
                            setError(result.error);
                            toast({ title: "Split Error", description: result.error, variant: "destructive" });
                        } else if (result.zipDataUri) {
                            downloadDataUri(result.zipDataUri, `${file.name.replace(/\.pdf$/i, '')}_all_pages.zip`);
                            toast({ title: "Split Successful!", description: "All pages extracted and download started." });
                        }
                    } catch (e: any) {
                        setError(e.message || "Error splitting all pages.");
                        toast({ title: "Split Failed", description: e.message, variant: "destructive" });
                    } finally {
                        setIsSplitting(false);
                    }
                }}
                disabled={!file || isSplitting || isLoadingPdf || totalPages === 0}
                className="w-full mt-3"
                >
                <Files className="mr-2 h-4 w-4" /> Split All Pages Individually
              </Button>
            </CardContent>
            <CardFooter className="mt-4 border-t pt-4">
              <Button
                onClick={handleSplit}
                disabled={!file || isSplitting || isLoadingPdf || (splitMode === 'range' && rangeMode === 'custom' && customRanges.length === 0)}
                className="w-full"
                size="lg"
              >
                {isSplitting && splitMode === 'range' ? (
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
    </div>
  );
}

    