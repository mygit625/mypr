
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { ListOrdered, Loader2, Info, Download, CheckCircle, ArrowRightCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { addPageNumbersAction, type PageNumberPosition } from './actions';

const PREVIEW_TARGET_HEIGHT_PAGENUM = 400;

export default function AddPageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [position, setPosition] = useState<PageNumberPosition>('bottom-center');
  const [pageRange, setPageRange] = useState('');
  const [textFormat, setTextFormat] = useState('Page {n} of {N}');
  const [fontSize, setFontSize] = useState(12);
  const [startingNumber, setStartingNumber] = useState(1);
  
  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      setFile(selectedFile);
      setError(null);
      try {
        const dataUri = await readFileAsDataURL(selectedFile);
        setPdfDataUri(dataUri);
      } catch (e: any) {
        setError(e.message || "Failed to read file.");
        toast({ title: "File Read Error", description: e.message, variant: "destructive" });
        setPdfDataUri(null);
        setFile(null);
      }
    } else {
      setFile(null);
      setPdfDataUri(null);
    }
  };

  const handleAddNumbers = async () => {
    if (!file || !pdfDataUri) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await addPageNumbersAction({
        pdfDataUri,
        position,
        pageRange,
        textFormat,
        fontSize,
        startingNumber,
      });

      if (result.error) {
        setError(result.error);
        toast({ title: "Processing Error", description: result.error, variant: "destructive" });
      } else if (result.numberedPdfDataUri) {
        downloadDataUri(result.numberedPdfDataUri, `numbered_${file.name}`);
        toast({ title: "Success!", description: `Page numbers added. Download has started.` });
        // Reset state after success
        setFile(null);
        setPdfDataUri(null);
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred.";
      setError(errorMessage);
      toast({ title: "Processing Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const positionOptions: { value: PageNumberPosition; label: string }[] = [
    { value: 'bottom-center', label: 'Bottom Center' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'top-center', label: 'Top Center' },
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-0">
      <header className="text-center py-8">
        <ListOrdered className="mx-auto h-12 w-12 text-primary mb-3" />
        <h1 className="text-4xl font-bold tracking-tight">Add Page Numbers to PDF</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Easily insert page numbers into your PDF document with various customization options.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Panel: File Upload / Preview */}
        <div className="lg:w-2/3 flex flex-col items-center justify-center bg-card border rounded-lg shadow-md p-6 min-h-[500px]">
          {!pdfDataUri ? (
            <div className="w-full max-w-md">
              <FileUploadZone 
                onFilesSelected={handleFileSelected} 
                multiple={false}
                accept="application/pdf"
              />
            </div>
          ) : (
            file && (
              <>
                <div className="w-full h-full flex items-center justify-center">
                   <PdfPagePreview pdfDataUri={pdfDataUri} pageIndex={0} targetHeight={PREVIEW_TARGET_HEIGHT_PAGENUM} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground truncate w-full text-center" title={file.name}>{file.name}</p>
              </>
            )
          )}
        </div>

        {/* Right Panel: Options & Action */}
        <div className="lg:w-1/3 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Numbering Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="position">Position</Label>
                <Select value={position} onValueChange={(value) => setPosition(value as PageNumberPosition)}>
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positionOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="page-range">Pages to number</Label>
                <Input
                  id="page-range"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  placeholder="e.g., 1-5, 8, 10-12 (blank for all)"
                  disabled={!file}
                />
              </div>

              <div>
                <Label htmlFor="text-format">Text format</Label>
                <Input
                  id="text-format"
                  value={textFormat}
                  onChange={(e) => setTextFormat(e.target.value)}
                  disabled={!file}
                />
                 <p className="text-xs text-muted-foreground mt-1">Use {'{n}'} for page number and {'{N}'} for total pages.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="starting-number">Start at</Label>
                    <Input
                    id="starting-number"
                    type="number"
                    value={startingNumber}
                    onChange={(e) => setStartingNumber(Number(e.target.value))}
                    min={1}
                    disabled={!file}
                    />
                </div>
                 <div>
                    <Label htmlFor="font-size">Font size: {fontSize}pt</Label>
                    <Slider
                      id="font-size"
                      min={8} max={72} step={1}
                      value={[fontSize]}
                      onValueChange={(value) => setFontSize(value[0])}
                      disabled={!file}
                    />
                 </div>
              </div>

            </CardContent>
            <CardFooter>
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
                    Add Page Numbers
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mt-6 max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
