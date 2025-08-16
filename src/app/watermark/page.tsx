
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
import { Droplets, Loader2, Info, ArrowRightCircle, Check, Download, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { watermarkPdfAction, type WatermarkPosition } from '@/app/watermark/actions';
import { cn } from '@/lib/utils';
import { getInitialPageDataAction, type PageData } from '@/app/organize/actions';
import { PageConfetti } from '@/components/ui/page-confetti';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const PREVIEW_TARGET_HEIGHT_WATERMARK = 250;

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
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
        setShowConfetti(true);
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
      <PageConfetti active={showConfetti} />
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
                    <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg">
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
      
      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Add a Watermark to a PDF</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3>
              <p className="text-muted-foreground">Select or drag your PDF file into the upload area. The document will be securely processed in your browser.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Customize Your Watermark</h3>
              <p className="text-muted-foreground">Enter your text and use the options panel to choose the position, font size, color, opacity, and rotation. See a live preview of your changes.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Apply & Download</h3>
              <p className="text-muted-foreground">Click the "Apply Watermark" button. Your new, watermarked PDF will be ready for instant download.</p>
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
              <AccordionTrigger className="text-lg text-left">Can I add an image as a watermark?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Currently, our tool specializes in adding text-based watermarks. This provides a wide range of customization options for protecting or labeling your documents. We are exploring the possibility of adding image watermark support in the future.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Is the watermark applied to every page?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes. When you apply the watermark, it will be added to every page of your PDF document in the same position and style you have selected, ensuring consistent branding or labeling throughout the file.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Can the watermark be removed after it's been added?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Once the watermark is applied and you download the new PDF, it becomes a permanent part of each page and cannot be easily removed by standard PDF viewers. This makes it effective for protecting your content.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg text-left">Are my uploaded PDF files secure?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Your privacy is our priority. All processing happens directly on our secure servers, and your files are automatically deleted after one hour. We never share or access your files.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">Protect and Brand Your Documents</h2>
            <p>Adding a watermark to a PDF is a simple yet powerful way to protect your intellectual property, assert ownership, or indicate the status of a document. Whether you're a photographer sharing a portfolio, a business sending a confidential proposal, or a writer distributing a draft, a watermark is an essential tool. Our free online "Add Watermark to PDF" tool makes this process effortless.</p>
            <h3>Common Uses for Watermarking PDFs</h3>
            <ul>
              <li><strong>Copyright Protection:</strong> Place your name or company logo on your work to deter unauthorized use and ensure you are credited.</li>
              <li><strong>Branding:</strong> Consistently brand your documents with your company name or website, reinforcing your brand identity with every file you share.</li>
              <li><strong>Document Status:</strong> Clearly label documents with terms like "DRAFT," "CONFIDENTIAL," "COPY," or "SAMPLE" to prevent misuse and manage document versions effectively.</li>
              <li><strong>Information Tagging:</strong> Add important information like a date, a username, or a transaction ID to each page for tracking and reference purposes.</li>
            </ul>
            <p>Our tool offers complete control over your text watermark's appearance. You can fine-tune the font size, transparency (opacity), rotation, and color to create a watermark that is either subtle or prominent, depending on your needs. With nine placement options, you can position your watermark precisely where it works best for your layout. Protect and professionalize your documents in seconds with our easy-to-use watermarking tool.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
