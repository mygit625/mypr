
"use client";

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { CheckCircle, Loader2, Info, Plus, ArrowRightCircle, Minimize2, X, Download, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { compressPdfAction, type CompressionLevel } from '@/app/compress/actions';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PageConfetti } from '@/components/ui/page-confetti';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface CompressionResultStats {
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
}

const PREVIEW_TARGET_HEIGHT_COMPRESS = 400; 

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<CompressionResultStats | null>(null);
  const [compressedPdfUri, setCompressedPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>("recommended");
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setPdfDataUri(null);
    setCompressionStats(null);
    setCompressedPdfUri(null);
    setError(null);
    setShowConfetti(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  }

  const handleFileSelectedForUploadZone = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      handleNewFile(selectedFiles[0]);
    }
  };
  
  const handleFileChangeFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleNewFile(event.target.files[0]);
    }
  };

  const handleNewFile = async (selectedFile: File) => {
    resetState();
    setFile(selectedFile);
    try {
      const dataUri = await readFileAsDataURL(selectedFile);
      setPdfDataUri(dataUri);
    } catch (e: any) {
      setError(e.message || "Failed to read file.");
      toast({ title: "File Read Error", description: e.message, variant: "destructive" });
      setPdfDataUri(null);
      setFile(null);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes < 0) bytes = 0;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleCompress = async () => {
    if (!file || !pdfDataUri) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to compress.",
        variant: "destructive",
      });
      return;
    }

    setIsCompressing(true);
    setCompressionStats(null);
    setCompressedPdfUri(null);
    setError(null);

    try {
      const result = await compressPdfAction({ pdfDataUri, compressionLevel });

      if (result.error) {
        setError(result.error);
        toast({ title: "Compression Error", description: result.error, variant: "destructive" });
      } else if (result.compressedPdfDataUri && result.originalSize !== undefined && result.compressedSize !== undefined) {
        const reduction = result.originalSize > 0 ? ((result.originalSize - result.compressedSize) / result.originalSize) * 100 : 0;
        setCompressionStats({
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            reductionPercentage: parseFloat(reduction.toFixed(2))
        });
        setCompressedPdfUri(result.compressedPdfDataUri);
        setShowConfetti(true);
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during compression.";
      setError(errorMessage);
      toast({ title: "Compression Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (compressedPdfUri && file) {
        downloadDataUri(compressedPdfUri, `compressed_${file.name}`);
        toast({ description: "Download started." });
    } else {
        toast({ description: "No compressed file available to download. Please process a file first.", variant: "destructive" });
    }
  };
  
  const handleRemoveFile = () => {
    resetState();
  };


  const compressionOptions: { value: CompressionLevel; label: string; description: string }[] = [
    { value: "extreme", label: "EXTREME COMPRESSION", description: "Less quality, high compression" },
    { value: "recommended", label: "RECOMMENDED COMPRESSION", description: "Good quality, good compression" },
    { value: "less", label: "LESS COMPRESSION", description: "High quality, less compression" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-0">
      <PageConfetti active={showConfetti} />
      <header className="text-center py-8">
        <Minimize2 className="mx-auto h-12 w-12 text-primary mb-3" />
        <h1 className="text-4xl font-bold tracking-tight">Compress PDF File</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Reduce the file size of your PDF while maintaining quality. This tool processes one PDF at a time.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3 relative min-h-[400px] lg:min-h-[500px] flex flex-col items-center justify-center bg-card border rounded-lg shadow-md p-6">
          {!pdfDataUri && (
            <div className="w-full max-w-md">
              <FileUploadZone 
                onFilesSelected={handleFileSelectedForUploadZone} 
                multiple={false}
                accept="application/pdf" 
              />
            </div>
          )}
          {pdfDataUri && file && (
            <>
              <div className="w-full h-full flex items-center justify-center">
                 <PdfPagePreview pdfDataUri={compressedPdfUri || pdfDataUri} pageIndex={0} targetHeight={PREVIEW_TARGET_HEIGHT_COMPRESS} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground truncate w-full text-center" title={file.name}>{file.name}</p>
              {compressionStats && (
                <div className="mt-2 w-full max-w-sm">
                  <div className="flex justify-between text-xs mb-1">
                      <span>{formatBytes(compressionStats.originalSize)}</span>
                      <span>{formatBytes(compressionStats.compressedSize)}</span>
                  </div>
                  <Progress value={100 - compressionStats.reductionPercentage} className="h-2" />
                  <p className="text-center text-sm font-semibold text-primary mt-1">
                    Reduced by {compressionStats.reductionPercentage}%
                  </p>
                </div>
              )}
               <Button
                variant="destructive"
                size="icon"
                className="absolute top-4 left-4 h-10 w-10 rounded-full shadow-lg hover:bg-destructive/90"
                onClick={handleRemoveFile}
                aria-label="Remove current PDF file"
              >
                <X className="h-5 w-5" />
              </Button>
            </>
          )}
           <Button
            variant="default"
            size="icon"
            className="absolute top-4 right-4 h-12 w-12 rounded-full shadow-lg"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add or change PDF file"
          >
            <Plus className="h-6 w-6" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChangeFromInput}
            accept="application/pdf"
            className="hidden"
          />
        </div>

        <div className="lg:w-1/3 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Compression level</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={compressionLevel} onValueChange={(value) => setCompressionLevel(value as CompressionLevel)} className="space-y-2">
                {compressionOptions.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={`comp-${option.value}`}
                    className={cn(
                      "flex flex-col p-3 border rounded-lg cursor-pointer hover:border-primary transition-all",
                      compressionLevel === option.value && "border-primary ring-2 ring-primary bg-primary/5"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-primary">{option.label}</span>
                      <RadioGroupItem value={option.value} id={`comp-${option.value}`} className="sr-only" />
                      {compressionLevel === option.value && <CheckCircle className="h-5 w-5 text-green-500" />}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">{option.description}</span>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                {compressedPdfUri ? (
                    <>
                        <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom" size="lg">
                            <Download className="mr-2 h-5 w-5"/> Download Compressed PDF
                        </Button>
                        <Button onClick={resetState} className="w-full" variant="outline">
                            Compress Another File
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={handleCompress}
                        disabled={!file || isCompressing}
                        className="w-full text-lg py-6"
                        size="lg"
                        >
                        {isCompressing ? (
                            <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Compressing...
                            </>
                        ) : (
                            <>
                            <ArrowRightCircle className="mr-2 h-5 w-5" />
                            Compress PDF
                            </>
                        )}
                    </Button>
                )}
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {error && !isCompressing && (
        <Alert variant="destructive" className="mt-6 max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Compress a PDF</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3>
              <p className="text-muted-foreground">Select or drag your PDF file into the upload area. The file is processed securely and is never stored permanently on our servers.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Choose Compression Level</h3>
              <p className="text-muted-foreground">Select your desired balance between file size and quality. "Recommended" offers the best results for most documents.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Compress & Download</h3>
              <p className="text-muted-foreground">Click the "Compress PDF" button. After processing, you'll see the size reduction and a button to download your new, smaller PDF.</p>
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
              <AccordionTrigger className="text-lg text-left">Will compressing my PDF reduce its quality?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Our tool aims to reduce file size with minimal impact on visual quality. The "Recommended" setting provides a great balance. "Extreme Compression" will result in a smaller file but may show some quality loss, especially in images.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Is there a limit on the file size I can upload?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                While we support large files, for best performance, we recommend uploading files under 50MB. Very large or complex PDFs may take longer to process or could time out in a browser environment.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">How does the PDF compression work?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Our tool primarily reduces file size by optimizing and re-compressing images within the PDF, which are often the largest contributors to file size. It also removes redundant data and applies efficient compression to the PDF's internal structure.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">Optimize Your PDFs with Smart Compression</h2>
            <p>Large PDF files are cumbersome to share via email, slow to load, and take up unnecessary storage space. Our free online PDF compressor is designed to solve this problem by intelligently reducing your file size without sacrificing readability. Whether you're dealing with scanned documents, image-heavy reports, or lengthy presentations, our tool provides a simple and effective solution.</p>
            
            <h3>Why Reduce PDF File Size?</h3>
            <ul>
              <li><strong>Easy Sharing:</strong> Compressed PDFs are small enough to meet email attachment size limits, making them easy to send to colleagues, clients, or friends.</li>
              <li><strong>Faster Loading Times:</strong> Smaller files load significantly faster on websites and in document viewers, improving the user experience for anyone accessing your documents online.</li>
              <li><strong>Save Storage Space:</strong> Efficiently archive your documents by reducing their footprint on your hard drive or cloud storage.</li>
            </ul>
            <p>By using our PDF compression tool, you can choose the level of compression that best suits your needs, from high-quality for professional documents to extreme compression for maximum size reduction. The process is fast, secure, and happens right in your browser, ensuring your data remains private.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
