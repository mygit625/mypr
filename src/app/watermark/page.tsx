
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Droplets, Loader2, Info, ArrowRightCircle, Check, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { watermarkPdfAction, type WatermarkPosition } from './actions';
import { cn } from '@/lib/utils';
import { getInitialPageDataAction, type PageData } from '../organize/actions';

const PREVIEW_TARGET_HEIGHT_WATERMARK = 250;

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [position, setPosition] = useState<WatermarkPosition>('middle-center');
  const [fontSize, setFontSize] = useState(48);
  const [rotation, setRotation] = useState(-45);
  const [opacity, setOpacity] = useState(0.5);
  const [fontColor, setFontColor] = useState('#ff0000'); // Red

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

        const result = await getInitialPageDataAction({ pdfDataUri: dataUri });
        if (result.error) throw new Error(result.error);
        if (result.pages) setPages(result.pages);

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

  const handleAddWatermark = async () => {
    if (!file || !pdfDataUri) {
      toast({ title: "No file selected", description: "Please select a PDF file.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessedUri(null);

    try {
      const result = await watermarkPdfAction({
        pdfDataUri,
        text: watermarkText,
        position,
        fontSize,
        rotation,
        opacity,
        fontColor,
      });

      if (result.error) {
        setError(result.error);
        toast({ title: "Processing Error", description: result.error, variant: "destructive" });
      } else if (result.watermarkedPdfDataUri) {
        setProcessedUri(result.watermarkedPdfDataUri);
        toast({ title: "Success!", description: "Watermark added. Click Download to save." });
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      toast({ title: "Processing Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (processedUri && file) {
      downloadDataUri(processedUri, `watermarked_${file.name}`);
    }
  };

  const positionOptions: { value: WatermarkPosition; label: string; gridClass: string }[] = [
    { value: 'top-left', label: 'Top Left', gridClass: 'col-start-1 row-start-1' },
    { value: 'top-center', label: 'Top Center', gridClass: 'col-start-2 row-start-1' },
    { value: 'top-right', label: 'Top Right', gridClass: 'col-start-3 row-start-1' },
    { value: 'middle-left', label: 'Middle Left', gridClass: 'col-start-1 row-start-2' },
    { value: 'middle-center', label: 'Middle Center', gridClass: 'col-start-2 row-start-2' },
    { value: 'middle-right', label: 'Middle Right', gridClass: 'col-start-3 row-start-2' },
    { value: 'bottom-left', label: 'Bottom Left', gridClass: 'col-start-1 row-start-3' },
    { value: 'bottom-center', label: 'Bottom Center', gridClass: 'col-start-2 row-start-3' },
    { value: 'bottom-right', label: 'Bottom Right', gridClass: 'col-start-3 row-start-3' },
  ];

  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <Droplets className="mx-auto h-12 w-12 text-primary mb-3" />
        <h1 className="text-4xl font-bold tracking-tight">Add Watermark to PDF</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Easily stamp text over your PDF pages with full control over style and placement.
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
          <div className="lg:w-2/3">
            <ScrollArea className="h-[calc(100vh-250px)] w-full border rounded-lg bg-muted/20 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pages.map(p => (
                   <div key={p.id} className="flex flex-col items-center">
                    <PdfPagePreview
                      pdfDataUri={processedUri || pdfDataUri}
                      pageIndex={p.originalIndex}
                      targetHeight={PREVIEW_TARGET_HEIGHT_WATERMARK}
                      className="shadow-md"
                    />
                    <span className="text-sm text-muted-foreground mt-2">Page {p.originalIndex + 1}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="lg:w-1/3 space-y-6 lg:sticky lg:top-24 self-start">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Watermark Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div>
                  <Label htmlFor="watermark-text">Watermark Text</Label>
                  <Input
                    id="watermark-text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g., DRAFT"
                  />
                </div>
                
                <div>
                  <Label>Position</Label>
                  <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-24 h-24 bg-muted/50 p-1 rounded-md mt-1">
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
                    <Label htmlFor="font-size">Font size: {fontSize}pt</Label>
                    <Slider
                      id="font-size" min={8} max={144} step={1}
                      value={[fontSize]} onValueChange={(v) => setFontSize(v[0])}
                    />
                </div>

                <div>
                    <Label htmlFor="rotation">Rotation: {rotation}°</Label>
                    <Slider
                      id="rotation" min={-90} max={90} step={1}
                      value={[rotation]} onValueChange={(v) => setRotation(v[0])}
                    />
                </div>

                <div>
                    <Label htmlFor="opacity">Opacity: {opacity.toFixed(2)}</Label>
                    <Slider
                      id="opacity" min={0} max={1} step={0.05}
                      value={[opacity]} onValueChange={(v) => setOpacity(v[0])}
                    />
                </div>
                
                <div>
                  <Label htmlFor="font-color">Color</Label>
                  <Input
                    id="font-color"
                    type="color"
                    value={fontColor}
                    onChange={(e) => setFontColor(e.target.value)}
                    className="p-1 h-10"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                 {processedUri ? (
                    <>
                    <Button onClick={handleDownload} className="w-full" size="lg">
                        <Download className="mr-2 h-5 w-5"/> Download PDF
                    </Button>
                     <Button onClick={resetState} className="w-full" variant="outline">
                        Add Another Watermark
                    </Button>
                    </>
                ) : (
                    <Button
                    onClick={handleAddWatermark}
                    disabled={isProcessing}
                    className="w-full text-lg py-6" size="lg"
                    >
                    {isProcessing ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Adding Watermark...</>
                    ) : (
                        <><ArrowRightCircle className="mr-2 h-5 w-5" />Apply Watermark</>
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
