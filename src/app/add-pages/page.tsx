
"use client";

import { useState, useRef, useCallback, ChangeEvent } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { FilePlus2, Loader2, Info, Download, Trash2, PlusCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { getInitialPageDataAction, assemblePdfAction, type PageData } from './actions';
import { cn } from '@/lib/utils';

interface PdfSegment {
  id: string;
  file?: File; // Original file, might be undefined if segment data is reloaded/passed around
  dataUri: string;
  name: string;
  pages: PageData[];
  pageCount: number;
}

const PREVIEW_TARGET_HEIGHT = 100;

export default function AddPagesPage() {
  const [pdfSegments, setPdfSegments] = useState<PdfSegment[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingInsert, setIsLoadingInsert] = useState<{ active: boolean; index: number | null }>({ active: false, index: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertionIndexRef = useRef<number>(0); // Store index for file input callback

  const processAndAddFiles = async (files: File[], insertionIndex: number) => {
    if (files.length === 0) return;

    setIsLoadingInsert({ active: true, index: insertionIndex });
    setError(null);

    const newSegments: PdfSegment[] = [];
    for (const file of files) {
      if (pdfSegments.some(seg => seg.name === file.name && seg.file?.size === file.size)) {
        toast({ title: "Duplicate Skipped", description: `File ${file.name} seems to be a duplicate and was skipped.`, variant: "default" });
        continue;
      }
      try {
        const dataUri = await readFileAsDataURL(file);
        const pageDataResult = await getInitialPageDataAction({ pdfDataUri: dataUri });
        if (pageDataResult.error) {
          throw new Error(pageDataResult.error);
        }
        if (pageDataResult.pages && pageDataResult.pages.length > 0) {
          newSegments.push({
            id: crypto.randomUUID(),
            file,
            dataUri,
            name: file.name,
            pages: pageDataResult.pages.map(p => ({ ...p, rotation: 0 })),
            pageCount: pageDataResult.pages.length,
          });
        } else if (pageDataResult.pages && pageDataResult.pages.length === 0) {
            toast({ title: "Empty PDF Skipped", description: `File ${file.name} has no pages and was skipped.`});
        }
      } catch (e: any) {
        toast({ title: `Error processing ${file.name}`, description: e.message, variant: "destructive" });
        setError(`Failed to process ${file.name}: ${e.message}`);
      }
    }

    if (newSegments.length > 0) {
      setPdfSegments(prevSegments => {
        const updatedSegments = [...prevSegments];
        updatedSegments.splice(insertionIndex, 0, ...newSegments);
        return updatedSegments;
      });
    }
    setIsLoadingInsert({ active: false, index: null });
  };
  
  const handleInitialFilesSelected = (selectedFiles: File[]) => {
    setIsLoadingInitial(true);
    setPdfSegments([]); 
    processAndAddFiles(selectedFiles, 0).finally(() => setIsLoadingInitial(false));
  };

  const handlePlusIconClick = (index: number) => {
    insertionIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processAndAddFiles(Array.from(event.target.files), insertionIndexRef.current);
      event.target.value = ""; 
    }
  };

  const handleRemoveSegment = (segmentId: string) => {
    setPdfSegments(prev => prev.filter(seg => seg.id !== segmentId));
    toast({ description: "PDF segment removed." });
  };

  const handleAssembleAndDownload = async () => {
    if (pdfSegments.length === 0) {
      toast({ title: "No PDFs Added", description: "Please add at least one PDF document.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const dataUris = pdfSegments.map(seg => seg.dataUri);
      const result = await assemblePdfAction({ orderedPdfDataUris: dataUris });

      if (result.error) {
        setError(result.error);
        toast({ title: "Assembly Error", description: result.error, variant: "destructive" });
      } else if (result.assembledPdfDataUri) {
        downloadDataUri(result.assembledPdfDataUri, `assembled_document.pdf`);
        toast({ title: "Assembly Successful!", description: "Your PDF has been assembled and download has started." });
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during assembly.");
      toast({ title: "Assembly Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPlusButton = (index: number, isPrimaryCTA: boolean = false) => (
    <div className={cn("flex justify-center items-center", isPrimaryCTA ? "py-10" : "my-4 inter-segment-plus-wrapper")}>
      {isLoadingInsert.active && isLoadingInsert.index === index ? (
        <div className="flex flex-col items-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <span>Adding PDFs...</span>
        </div>
      ) : (
        <Button
          variant={isPrimaryCTA ? "default" : "outline"}
          size={isPrimaryCTA ? "lg" : "default"}
          onClick={() => handlePlusIconClick(index)}
          className={cn(isPrimaryCTA ? "text-lg py-8 px-10 rounded-full" : "rounded-full aspect-square p-0 h-12 w-12 sm:h-14 sm:w-14", "flex flex-col items-center justify-center group shadow-md hover:shadow-lg transition-all")}
          aria-label={isPrimaryCTA ? "Add initial PDF document(s)" : `Insert PDF document(s) here (position ${index + 1})`}
        >
          <PlusCircle className={cn("h-6 w-6 sm:h-7 sm:w-7 text-primary group-hover:scale-110 transition-transform", isPrimaryCTA && "h-8 w-8 sm:h-10 sm:w-10 mb-2")} />
          {isPrimaryCTA && <span className="mt-1 font-semibold">Add PDF(s)</span>}
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept="application/pdf"
        className="hidden"
      />
      <header className="text-center py-6">
        <FilePlus2 className="mx-auto h-14 w-14 text-primary mb-3" />
        <h1 className="text-3xl font-bold tracking-tight">Add Pages to PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Assemble a new PDF by adding documents in sequence. Click the <PlusCircle className="inline h-4 w-4 text-primary" /> icons to insert PDFs.
        </p>
      </header>

      {pdfSegments.length === 0 && !isLoadingInitial && (
        <Card className="shadow-lg border-2 border-dashed hover:border-primary transition-colors">
          <CardContent className="p-6 text-center">
            <FileUploadZone 
                onFilesSelected={handleInitialFilesSelected} 
                multiple 
                accept="application/pdf"
                maxFiles={10}
            />
            <p className="text-xs text-muted-foreground mt-3">Or, use the plus button below to start.</p>
             {renderPlusButton(0, true)}
          </CardContent>
        </Card>
      )}
       {isLoadingInitial && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="ml-3 text-lg text-muted-foreground">Loading initial PDF(s)...</p>
          </div>
        )}


      {pdfSegments.length > 0 && (
        <>
          {renderPlusButton(0)} 
          {pdfSegments.map((segment, segIndex) => (
            <div key={segment.id} className="space-y-3">
              <Card className="shadow-md border border-border hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row justify-between items-start pb-3 pt-4 px-4">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2 text-muted-foreground" />
                      {segment.name}
                    </CardTitle>
                    <CardDescription className="text-xs">{segment.pageCount} page(s)</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveSegment(segment.id)} className="text-destructive hover:bg-destructive/10 h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove this PDF segment</span>
                  </Button>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ScrollArea className="h-[250px] border rounded-md p-2 bg-muted/20">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-1.5">
                      {segment.pages.map((page) => (
                        <div key={`${segment.id}-page-${page.originalIndex}-${page.id}`} className="flex flex-col items-center p-1 border rounded bg-card shadow-sm">
                          <PdfPagePreview
                            pdfDataUri={segment.dataUri}
                            pageIndex={page.originalIndex}
                            rotation={0} 
                            targetHeight={PREVIEW_TARGET_HEIGHT}
                            className="my-0.5"
                          />
                          <span className="text-xs mt-1 text-muted-foreground">Page {page.originalIndex + 1}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              {renderPlusButton(segIndex + 1)}
            </div>
          ))}
        </>
      )}

      {error && (
        <Alert variant="destructive" className="mt-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {pdfSegments.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleAssembleAndDownload}
            disabled={isProcessing || isLoadingInitial || isLoadingInsert.active}
            size="lg"
            className="text-lg py-3 px-8 shadow-lg hover:shadow-xl transition-shadow"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Download className="mr-2 h-5 w-5" />
            )}
            Save & Download Assembled PDF
          </Button>
        </div>
      )}
    </div>
  );
}

    