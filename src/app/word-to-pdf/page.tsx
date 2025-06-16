
"use client";

import { useState, useRef, ChangeEvent } from 'react'; // Removed useEffect, useCallback
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { FileCode, Loader2, Info, Download, Plus, ArrowRightCircle, FileText } from 'lucide-react'; // Added FileText
import { Badge } from '@/components/ui/badge'; // Added Badge
import { useToast } from '@/hooks/use-toast';
import { readFileAsArrayBuffer } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { convertWordToPdfAction } from './actions';
import { cn } from '@/lib/utils';

export default function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedPdfUri, setConvertedPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      if (selectedFile.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        toast({
          title: "Invalid File Type",
          description: "Please upload a .docx file.",
          variant: "destructive",
        });
        setFile(null);
        setError(null);
        setConvertedPdfUri(null);
        return;
      }
      setFile(selectedFile);
      setConvertedPdfUri(null);
      setError(null);
    } else {
      setFile(null);
      setError(null);
      setConvertedPdfUri(null);
    }
  };

  const handleFileChangeFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFileSelected(Array.from(event.target.files));
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleConvert = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a .docx file to convert.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    setConvertedPdfUri(null);
    setError(null);
    toast({ title: "Processing Document", description: "Converting your Word document to PDF..." });

    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const docxFileBase64 = Buffer.from(arrayBuffer).toString('base64');

      const result = await convertWordToPdfAction({ docxFileBase64, originalFileName: file.name });

      if (result.error) {
        setError(result.error);
        toast({ title: "Conversion Error", description: result.error, variant: "destructive" });
      } else if (result.pdfDataUri) {
        setConvertedPdfUri(result.pdfDataUri);
        downloadDataUri(result.pdfDataUri, `${file.name.replace(/\.docx$/, '')}.pdf`);
        toast({
          title: "Conversion Successful!",
          description: "Word document converted to PDF.",
          variant: "default",
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during conversion.";
      setError(errorMessage);
      toast({ title: "Conversion Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsConverting(false);
    }
  };


  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-0">
      <header className="text-center pt-8 pb-4">
        <FileCode className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Word to PDF (Extract Text & Images)</h1>
        <p className="text-muted-foreground mt-2 text-base md:text-lg max-w-2xl mx-auto">
          Upload .docx file. Preview it, then convert to a PDF with extracted text and images. Layout may be simplified.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left Panel: File Upload / Preview */}
        <div className="lg:w-2/3 relative min-h-[400px] lg:min-h-[500px] flex flex-col items-center justify-center bg-card border rounded-lg shadow-md p-4 sm:p-6">
          {!file ? (
            <div className="w-full max-w-md">
              <FileUploadZone
                onFilesSelected={handleFileSelected}
                multiple={false}
                accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
            </div>
          ) : (
            // New Iconic Preview
            <div className="w-full h-full flex flex-col items-center justify-center p-2">
              <Card className="w-full max-w-[280px] p-6 sm:p-8 flex flex-col items-center justify-center shadow-lg aspect-[3/4] bg-background rounded-xl">
                <div className="w-4/5 bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center shadow-inner mb-4 aspect-[0.8/1]">
                  <Badge variant="default" className="mb-3 bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 text-xs sm:text-sm shadow">
                    DOCX
                  </Badge>
                  <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-blue-700 mt-2" />
                </div>
                <p className="mt-3 text-xs sm:text-sm text-muted-foreground truncate w-full text-center" title={file.name}>
                  {file.name}
                </p>
              </Card>
            </div>
          )}
          {/* FAB for adding/changing file */}
          <Button
            variant="default"
            size="icon"
            className="absolute top-3 right-3 lg:top-4 lg:right-4 h-10 w-10 lg:h-12 lg:w-12 rounded-full shadow-lg z-10"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add or change DOCX file"
            title="Upload or change DOCX file"
          >
            <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChangeFromInput}
            accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />
        </div>

        {/* Right Panel: Options & Action */}
        <div className="lg:w-1/3">
          <Card className="shadow-lg h-full flex flex-col sticky top-24">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-semibold">Word to PDF</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How to Convert</AlertTitle>
                <AlertDescription>
                  1. Upload your .docx file.
                  2. Click "Convert to PDF". The resulting PDF will extract text and images.
                  Font styles and complex layouts may be simplified.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="mt-auto border-t pt-6 pb-6">
              <Button
                onClick={handleConvert}
                disabled={!file || isConverting}
                className="w-full text-base md:text-lg py-3"
                size="lg"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <ArrowRightCircle className="mr-2 h-5 w-5" />
                    Convert to PDF
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {error && !isConverting && (
         <Alert variant="destructive" className="mt-8 max-w-lg mx-auto">
            <Info className="h-4 w-4"/>
            <AlertTitle>Process Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}

      {convertedPdfUri && !error && (
        <Alert variant="default" className="bg-green-50 border-green-200 mt-8 max-w-lg mx-auto">
          <Download className="h-4 w-4 text-green-600" /> {/* Changed to Download icon */}
          <AlertTitle className="text-green-700">PDF Ready!</AlertTitle>
          <AlertDescription className="text-green-600">
            Your Word document has been converted. Download should have started.
            <Button variant="link" size="sm" onClick={() => downloadDataUri(convertedPdfUri, `${file?.name.replace(/\.docx$/, '')}.pdf`)} className="text-green-700 hover:text-green-800 p-0 h-auto ml-1 underline">
              Download Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
