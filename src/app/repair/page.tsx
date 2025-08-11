
"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import PdfPagePreview from '@/components/feature/pdf-page-preview';
import { Wrench, Loader2, Info, Download, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { repairPdfAction } from './actions';

const PREVIEW_TARGET_HEIGHT_REPAIR = 300;

export default function RepairPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairedPdfUri, setRepairedPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repairAttempted, setRepairAttempted] = useState(false);
  const { toast } = useToast();

  const handleFileSelectedForUploadZone = async (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      const selectedFile = selectedFiles[0];
      setFile(selectedFile);
      setRepairedPdfUri(null);
      setError(null);
      setRepairAttempted(false);
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
      setRepairedPdfUri(null);
      setError(null);
      setRepairAttempted(false);
    }
  };

  const handleRepair = async () => {
    if (!file || !pdfDataUri) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to repair.",
        variant: "destructive",
      });
      return;
    }

    setIsRepairing(true);
    setRepairedPdfUri(null);
    setError(null);
    setRepairAttempted(false);

    try {
      const result = await repairPdfAction({ pdfDataUri, originalFileName: file.name });
      setRepairAttempted(true);

      if (result.error) {
        setError(result.error);
        toast({ title: "Repair Process Note", description: result.error, variant: "destructive", duration: 7000 });
      } else if (result.repairedPdfDataUri) {
        setRepairedPdfUri(result.repairedPdfDataUri);
        toast({
          title: "Repair Attempted Successfully!",
          description: "The PDF has been processed. Check the preview and download your file.",
          duration: 7000,
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during the repair process.";
      setError(errorMessage);
      setRepairAttempted(true);
      toast({ title: "Repair Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsRepairing(false);
    }
  };

  const handleDownload = () => {
    if (repairedPdfUri && file) {
        downloadDataUri(repairedPdfUri, `repaired_${file.name}`);
        toast({ description: "Download started." });
    } else {
        toast({ description: "No repaired file available to download.", variant: "destructive" });
    }
  };
  
  const resetAndStartOver = () => {
      setFile(null);
      setPdfDataUri(null);
      setRepairedPdfUri(null);
      setError(null);
      setRepairAttempted(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center py-8">
        <Wrench className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Repair PDF</h1>
        <p className="text-muted-foreground mt-2">
          Attempt to fix corrupted or damaged PDF files. Upload your PDF to begin.
        </p>
      </header>
      
      {!repairAttempted && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>Select the PDF file you want to attempt to repair.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadZone
              onFilesSelected={handleFileSelectedForUploadZone}
              multiple={false}
              accept="application/pdf"
            />
            {pdfDataUri && file && (
              <div className="mt-4 border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2 text-center">Preview of Uploaded PDF (First Page)</h3>
                <div className="flex justify-center items-center" style={{ minHeight: `${PREVIEW_TARGET_HEIGHT_REPAIR}px` }}>
                  <PdfPagePreview 
                      pdfDataUri={pdfDataUri} 
                      pageIndex={0} 
                      targetHeight={PREVIEW_TARGET_HEIGHT_REPAIR} 
                      className="max-w-full"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground text-center truncate" title={file.name}>
                  {file.name}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleRepair}
              disabled={!file || isRepairing}
              className="w-full"
              size="lg"
            >
              {isRepairing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Attempting Repair...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Repair PDF
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}


      {repairAttempted && !isRepairing && (
        <Card className="mt-6 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-center">
              {error ? <XCircle className="h-6 w-6 text-destructive mr-2" /> : <CheckCircle className="h-6 w-6 text-green-500 mr-2" />}
              Repair Process Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Repair Unsuccessful</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert variant="default" className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700">Repair Attempted</AlertTitle>
                  <AlertDescription className="text-green-600">
                    The PDF has been processed. Check the preview below and download the file to verify the repair.
                  </AlertDescription>
                </Alert>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div>
                        <h3 className="text-sm font-medium text-center mb-2">Original</h3>
                        <PdfPagePreview 
                            pdfDataUri={pdfDataUri} 
                            pageIndex={0} 
                            targetHeight={PREVIEW_TARGET_HEIGHT_REPAIR} 
                            className="border rounded-md"
                        />
                    </div>
                     <div>
                        <h3 className="text-sm font-medium text-center mb-2">Repaired</h3>
                        <PdfPagePreview 
                            pdfDataUri={repairedPdfUri} 
                            pageIndex={0} 
                            targetHeight={PREVIEW_TARGET_HEIGHT_REPAIR} 
                            className="border rounded-md"
                        />
                    </div>
                </div>
              </>
            )}
          </CardContent>
           <CardFooter className="flex-col gap-2">
                {repairedPdfUri && !error && (
                    <Button
                        onClick={handleDownload}
                        className="w-full bg-green-600 hover:bg-green-700 text-white animate-pulse-zoom"
                        size="lg"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download Repaired PDF
                    </Button>
                )}
                <Button onClick={resetAndStartOver} variant="outline" className="w-full">
                    Start Over with a New File
                </Button>
                 <p className="text-xs text-muted-foreground text-center w-full pt-4">
                    Note: This tool can fix some structural PDF issues. It may not recover data from severely damaged files.
                </p>
            </CardFooter>
        </Card>
      )}
    </div>
  );
}
