
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { getInitialPageDataAction, type PageData } from '@/app/organize/actions';
import { Split, Loader2, Info, PlusCircle, XCircle, Download, ArrowRight, Check, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { splitPdfAction, splitPdfByPagesAction, type CustomRange } from '@/app/split/actions';
import { cn } from '@/lib/utils';
import { RangeIcon, PagesIcon, SizeIcon } from '@/components/icons/split-tool-icons';

const PREVIEW_TARGET_HEIGHT_SPLIT = 180;

type MainMode = 'range' | 'pages' | 'size';
type RangeMode = 'custom' | 'fixed';
type PagesMode = 'all' | 'select';

// Helper function to convert a set of numbers to a range string
function numbersToRangeString(numbers: Set<number>): string {
  if (numbers.size === 0) return '';
  const sorted = Array.from(numbers).sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(',');
}

// Helper function to parse a range string into a set of numbers
function rangeStringToNumbers(rangeStr: string, totalPages: number): Set<number> {
  const result = new Set<number>();
  if (!rangeStr.trim()) return result;

  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart.includes('-')) {
      const [start, end] = trimmedPart.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) result.add(i);
        }
      }
    } else {
      const pageNum = Number(trimmedPart);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) result.add(pageNum);
    }
  }
  return result;
}


export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitResultUri, setSplitResultUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Mode states
  const [mainMode, setMainMode] = useState<MainMode>('range');
  const [rangeMode, setRangeMode] = useState<RangeMode>('custom');
  const [pagesMode, setPagesMode] = useState<PagesMode>('all');
  
  // Input states
  const [customRanges, setCustomRanges] = useState<CustomRange[]>([{ from: 1, to: 1 }]);
  const [fixedRangeSize, setFixedRangeSize] = useState(1);
  const [pagesToExtractInput, setPagesToExtractInput] = useState('');
  const [mergeOutput, setMergeOutput] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  const selectedPageNumbers = useMemo(() => {
    if (pagesMode === 'all') {
      return new Set(Array.from({ length: totalPages }, (_, i) => i + 1));
    }
    return rangeStringToNumbers(pagesToExtractInput, totalPages);
  }, [pagesMode, pagesToExtractInput, totalPages]);
  
  useEffect(() => {
    if (totalPages > 0) {
      setCustomRanges([{ from: 1, to: totalPages }]);
      setFixedRangeSize(totalPages > 1 ? 2 : 1);
      setPagesToExtractInput(`1-${totalPages}`);
    }
  }, [totalPages]);
  
  useEffect(() => {
    setMergeOutput(false);
  }, [mainMode]);

  const resetState = () => {
    setFile(null);
    setPdfDataUri(null);
    setPages([]);
    setTotalPages(0);
    setCustomRanges([{ from: 1, to: 1 }]);
    setError(null);
    setSplitResultUri(null);
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
        const result = await getInitialPageDataAction({ pdfDataUri: dataUri });
        if (result.error) {
          throw new Error(result.error);
        } else if (result.pages) {
          setPages(result.pages);
          setTotalPages(result.pages.length);
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

  const handleAddRange = () => {
    setCustomRanges([...customRanges, { from: 1, to: totalPages > 0 ? totalPages : 1 }]);
  };

  const handleRemoveRange = (index: number) => {
    setCustomRanges(customRanges.filter((_, i) => i !== index));
  };

  const handleRangeChange = (index: number, field: 'from' | 'to', value: string) => {
    const numValue = parseInt(value, 10);
    const newRanges = [...customRanges];
    if (!isNaN(numValue) && numValue >= 1 && numValue <= totalPages) {
      newRanges[index] = { ...newRanges[index], [field]: numValue };
      if (field === 'from' && numValue > newRanges[index].to) {
        newRanges[index].to = numValue;
      }
      setCustomRanges(newRanges);
    } else if (value === '') {
      newRanges[index] = { ...newRanges[index], [field]: 1 };
      setCustomRanges(newRanges);
    }
  };
  
  const getFinalRanges = (): CustomRange[] => {
    if (mainMode === 'range' && rangeMode === 'custom') {
      return customRanges.filter(r => r.from >= 1 && r.to >= r.from && r.to <= totalPages);
    }
    if (mainMode === 'range' && rangeMode === 'fixed') {
      if (fixedRangeSize <= 0) return [];
      const ranges: CustomRange[] = [];
      for (let i = 1; i <= totalPages; i += fixedRangeSize) {
        const to = Math.min(i + fixedRangeSize - 1, totalPages);
        ranges.push({ from: i, to: to });
      }
      return ranges;
    }
    return [];
  };
  
  const handlePageClick = (pageIndex: number) => { // 0-indexed
    const pageNum = pageIndex + 1;
    setPagesMode('select');

    const newSelected = new Set(selectedPageNumbers);
    if (newSelected.has(pageNum)) {
      newSelected.delete(pageNum);
    } else {
      newSelected.add(pageNum);
    }
    setPagesToExtractInput(numbersToRangeString(newSelected));
  };

  const handleSplit = async () => {
    if (!file || !pdfDataUri) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    setIsSplitting(true);
    setError(null);
    setSplitResultUri(null);

    try {
        let result;
        if (mainMode === 'range') {
            const finalRanges = getFinalRanges();
            if (finalRanges.length === 0) {
                toast({ title: "Invalid Ranges", description: "Please define at least one valid range.", variant: "destructive" });
                setIsSplitting(false);
                return;
            }
            result = await splitPdfAction({
                pdfDataUri,
                splitType: 'ranges',
                ranges: finalRanges,
                merge: mergeOutput,
            });
        } else if (mainMode === 'pages') {
            result = await splitPdfByPagesAction({
                pdfDataUri,
                extractMode: pagesMode,
                pagesToExtract: pagesToExtractInput,
                merge: mergeOutput,
            });
        } else {
            toast({ title: "Not Implemented", description: "This split mode is not yet available.", variant: "destructive" });
            setIsSplitting(false);
            return;
        }

      if (result.error) {
        setError(result.error);
        toast({ title: "Split Error", description: result.error, variant: "destructive" });
      } else if (result.zipDataUri) {
        setSplitResultUri(result.zipDataUri);
        if (resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during split.";
      setError(errorMessage);
      toast({ title: "Split Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSplitting(false);
    }
  };

  const handleDownload = () => {
    if (splitResultUri && file) {
      const outputFilename = mergeOutput 
        ? `${file.name.replace(/\.pdf$/i, '')}_merged_split.pdf` 
        : `${file.name.replace(/\.pdf$/i, '')}_split.zip`;
      downloadDataUri(splitResultUri, outputFilename);
    }
  };

  const finalRangesForPreview = mainMode === 'range' ? getFinalRanges() : [];
  const filesToBeCreated = mainMode === 'range' ? finalRangesForPreview.length : (pagesMode === 'all' ? totalPages : selectedPageNumbers.size);

  return (
    <div className="max-w-full mx-auto space-y-8">
      {!file && (
        <>
        <header className="text-center py-8">
            <Split className="mx-auto h-16 w-16 text-primary mb-4" />
            <h1 className="text-3xl font-bold tracking-tight">Split PDF File</h1>
            <p className="text-muted-foreground mt-2">
            Divide your PDF into multiple documents by specifying page ranges or extracting all pages.
            </p>
        </header>
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Upload PDF</CardTitle>
                <CardDescription>Select or drag and drop the PDF file you want to split.</CardDescription>
            </CardHeader>
            <CardContent>
                <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
            </CardContent>
        </Card>
        </>
      )}

      {isLoadingPdf && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Loading PDF...</p>
        </div>
      )}
      
      {file && pdfDataUri && pages.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel: Previews */}
            <div className="lg:col-span-2">
                <ScrollArea className="h-[calc(100vh-150px)] p-4">
                    {mainMode === 'range' ? (
                        <div className="space-y-8">
                            {finalRangesForPreview.map((range, index) => (
                                <div key={index}>
                                    <h3 className="text-center font-medium text-muted-foreground mb-2">Range {index + 1}</h3>
                                    <div className="p-4 border border-dashed rounded-lg flex justify-center items-center gap-4 flex-wrap bg-muted/20">
                                        <div className="flex flex-col items-center">
                                            <PdfPagePreview pdfDataUri={pdfDataUri} pageIndex={range.from - 1} targetHeight={PREVIEW_TARGET_HEIGHT_SPLIT} className="shadow-md" />
                                            <span className="text-sm mt-2 text-muted-foreground">{range.from}</span>
                                        </div>
                                        {range.to > range.from && (
                                            <>
                                            <div className="text-muted-foreground font-bold text-xl">...</div>
                                            <div className="flex flex-col items-center">
                                                <PdfPagePreview pdfDataUri={pdfDataUri} pageIndex={range.to - 1} targetHeight={PREVIEW_TARGET_HEIGHT_SPLIT} className="shadow-md" />
                                                <span className="text-sm mt-2 text-muted-foreground">{range.to}</span>
                                            </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : ( // mainMode === 'pages'
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {pages.map((p) => (
                                <div key={p.id} className="flex flex-col items-center cursor-pointer" onClick={() => handlePageClick(p.originalIndex)}>
                                    <div className="relative pt-2 pr-2">
                                        {selectedPageNumbers.has(p.originalIndex + 1) && (
                                            <CheckCircle className="absolute top-0 right-0 h-6 w-6 text-white fill-green-500 rounded-full z-10 border-2 border-white" />
                                        )}
                                        <PdfPagePreview pdfDataUri={pdfDataUri} pageIndex={p.originalIndex} targetHeight={PREVIEW_TARGET_HEIGHT_SPLIT + 40} className="shadow-md" />
                                    </div>
                                    <span className="text-sm mt-2 text-muted-foreground">{p.originalIndex + 1}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
            
            {/* Right Panel: Controls */}
            <div className="lg:sticky lg:top-20 self-start">
                 <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Split</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-1 border p-1 rounded-md bg-muted">
                            <Button variant={mainMode === 'range' ? 'secondary' : 'ghost'} onClick={() => setMainMode('range')} className={cn("h-auto py-2 flex-col gap-1 relative", mainMode === 'range' && "ring-2 ring-primary")}>
                                {mainMode === 'range' && <Check className="absolute top-1 right-1 h-3 w-3 text-green-500"/>}
                                <RangeIcon/> <span className="text-xs">Range</span>
                            </Button>
                            <Button variant={mainMode === 'pages' ? 'secondary' : 'ghost'} onClick={() => setMainMode('pages')} className={cn("h-auto py-2 flex-col gap-1 relative", mainMode === 'pages' && "ring-2 ring-primary")}>
                                {mainMode === 'pages' && <Check className="absolute top-1 right-1 h-3 w-3 text-green-500"/>}
                                <PagesIcon/> <span className="text-xs">Pages</span>
                            </Button>
                            <Button variant={'ghost'} onClick={() => setMainMode('size')} disabled className="h-auto py-2 flex-col gap-1 opacity-50"><SizeIcon/> <span className="text-xs">Size</span></Button>
                        </div>
                        
                        {mainMode === 'range' && (
                            <>
                                <div>
                                    <Label className="text-sm font-medium">Range mode:</Label>
                                    <div className="grid grid-cols-2 gap-1 mt-1">
                                        <Button variant={rangeMode === 'custom' ? 'secondary' : 'outline'} onClick={() => setRangeMode('custom')} className={cn(rangeMode === 'custom' && "ring-2 ring-primary")}>Custom ranges</Button>
                                        <Button variant={rangeMode === 'fixed' ? 'secondary' : 'outline'} onClick={() => setRangeMode('fixed')} className={cn(rangeMode === 'fixed' && "ring-2 ring-primary")}>Fixed ranges</Button>
                                    </div>
                                </div>

                                {rangeMode === 'custom' && (
                                    <div className="space-y-2 pt-2">
                                        {customRanges.map((range, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Label className="text-sm text-muted-foreground min-w-[50px]">Range {idx + 1}</Label>
                                                <Input type="number" value={range.from} onChange={(e) => handleRangeChange(idx, 'from', e.target.value)} min={1} max={totalPages} className="w-20" aria-label={`Range ${idx+1} from`}/>
                                                <span className="text-muted-foreground">to</span>
                                                <Input type="number" value={range.to} onChange={(e) => handleRangeChange(idx, 'to', e.target.value)} min={range.from} max={totalPages} className="w-20" aria-label={`Range ${idx+1} to`}/>
                                                {customRanges.length > 1 && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveRange(idx)} className="h-7 w-7">
                                                        <XCircle className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        <Button variant="outline" size="sm" onClick={handleAddRange} className="w-full"><PlusCircle className="mr-2 h-4 w-4"/> Add Range</Button>
                                    </div>
                                )}
                                
                                {rangeMode === 'fixed' && (
                                    <div className="space-y-2 pt-2">
                                        <Label htmlFor="fixed-range-size">Split into page ranges of:</Label>
                                        <Input id="fixed-range-size" type="number" value={fixedRangeSize} onChange={(e) => setFixedRangeSize(parseInt(e.target.value) || 1)} min={1} max={totalPages} />
                                    </div>
                                )}
                            </>
                        )}

                        {mainMode === 'pages' && (
                            <>
                                <Label className="text-sm font-medium">Extract mode:</Label>
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                    <Button variant={pagesMode === 'all' ? 'secondary' : 'outline'} onClick={() => setPagesMode('all')} className={cn(pagesMode === 'all' && "ring-2 ring-primary")}>Extract all pages</Button>
                                    <Button variant={pagesMode === 'select' ? 'secondary' : 'outline'} onClick={() => setPagesMode('select')} className={cn(pagesMode === 'select' && "ring-2 ring-primary")}>Select pages</Button>
                                </div>
                                {pagesMode === 'select' && (
                                    <div className="space-y-2 pt-2">
                                        <Label htmlFor="pages-to-extract">Pages to extract:</Label>
                                        <Input id="pages-to-extract" value={pagesToExtractInput} onChange={(e) => setPagesToExtractInput(e.target.value)} placeholder="e.g., 1-3,5,8-10"/>
                                    </div>
                                )}
                            </>
                        )}
                        
                        {(mainMode === 'range' || mainMode === 'pages') &&
                         <Alert variant="default" className="text-sm p-3 mt-2">
                            <Info className="h-4 w-4"/>
                            <AlertDescription>
                                {!mergeOutput && `This will create ${filesToBeCreated} PDF files.`}
                                {mergeOutput && `The ${filesToBeCreated} selected pages will be merged into a single PDF.`}
                            </AlertDescription>
                        </Alert>
                        }


                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox id="merge-output" checked={mergeOutput} onCheckedChange={(checked) => setMergeOutput(Boolean(checked))} />
                            <Label htmlFor="merge-output">Merge extracted pages into one PDF file.</Label>
                        </div>
                    </CardContent>
                    <CardFooter>
                       {splitResultUri ? (
                            <div ref={resultRef} className="w-full space-y-2">
                                <Button onClick={handleDownload} size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom">
                                    <Download className="mr-2 h-5 w-5"/> Download
                                </Button>
                                <Button onClick={resetState} variant="outline" className="w-full">
                                    Split Another PDF
                                </Button>
                            </div>
                        ) : (
                             <Button
                                onClick={handleSplit}
                                disabled={isSplitting || isLoadingPdf}
                                className="w-full"
                                size="lg"
                            >
                                {isSplitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Split className="mr-2 h-4 w-4" />}
                                Split PDF <ArrowRight className="ml-2 h-4 w-4"/>
                            </Button>
                        )}
                    </CardFooter>
                 </Card>
            </div>
        </div>
      )}
      
      {error && !isSplitting && (
        <Alert variant="destructive" className="mt-6 max-w-xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

    </div>
  );
}

    