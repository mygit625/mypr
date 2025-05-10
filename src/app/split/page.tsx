
"use client";

import { useState } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, SplitSquareHorizontal, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { splitPdfAction } from './actions';


export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitComplete, setSplitComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile(selectedFiles[0]);
    } else {
      setFile(null);
    }
    setSplitComplete(false);
    setError(null);
  };

  const handleSplit = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to split.",
        variant: "destructive",
      });
      return;
    }

    setIsSplitting(true);
    setSplitComplete(false);
    setError(null);

    try {
      const pdfDataUri = await readFileAsDataURL(file);
      const result = await splitPdfAction({ pdfDataUri });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Split Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.zipDataUri) {
        setSplitComplete(true);
        downloadDataUri(result.zipDataUri, "split_pages.zip");
        toast({
          title: "Split Successful!",
          description: "Your PDF has been split and download has started.",
        });
        setFile(null); // Clear file after successful split and download
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during split.";
      setError(errorMessage);
      toast({
        title: "Split Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <SplitSquareHorizontal className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Split PDF File</h1>
        <p className="text-muted-foreground mt-2">
          Divide your PDF document into individual pages, packaged in a ZIP file. Upload your file below.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>Select or drag and drop the PDF file you want to split.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button
            onClick={handleSplit}
            disabled={!file || isSplitting}
            className="w-full"
            size="lg"
          >
            {isSplitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Splitting...
              </>
            ) : (
              <>
                <SplitSquareHorizontal className="mr-2 h-4 w-4" />
                Split PDF
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {splitComplete && !error &&(
        <Alert variant="default" className="mt-4 bg-green-50 border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-700">Split Complete!</AlertTitle>
          <AlertDescription className="text-green-600">
            Your PDF file has been successfully split into individual pages. The ZIP file download should have started automatically.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
