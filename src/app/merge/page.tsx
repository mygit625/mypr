
"use client";

import { useState } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Combine, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { mergePdfsAction } from './actions';

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeComplete, setMergeComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setMergeComplete(false);
    setError(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast({
        title: "Not enough files",
        description: "Please select at least two PDF files to merge.",
        variant: "destructive",
      });
      return;
    }

    setIsMerging(true);
    setMergeComplete(false);
    setError(null);

    try {
      const pdfDataUris = await Promise.all(files.map(file => readFileAsDataURL(file)));
      const result = await mergePdfsAction({ pdfDataUris });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Merge Error",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.mergedPdfDataUri) {
        setMergeComplete(true);
        downloadDataUri(result.mergedPdfDataUri, "merged_document.pdf");
        toast({
          title: "Merge Successful!",
          description: "Your PDFs have been merged and download has started.",
        });
        setFiles([]); // Clear files after successful merge and download
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during merge.";
      setError(errorMessage);
      toast({
        title: "Merge Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <Combine className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Merge PDF Files</h1>
        <p className="text-muted-foreground mt-2">
          Combine multiple PDF documents into one. Upload your files below.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upload PDFs</CardTitle>
          <CardDescription>Select or drag and drop the PDF files you want to merge (up to 10 files).</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone onFilesSelected={handleFilesSelected} multiple accept="application/pdf" maxFiles={10} />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button
            onClick={handleMerge}
            disabled={files.length < 2 || isMerging}
            className="w-full"
            size="lg"
          >
            {isMerging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <Combine className="mr-2 h-4 w-4" />
                Merge PDFs ({files.length} selected)
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

      {mergeComplete && !error && (
        <Alert variant="default" className="mt-4 bg-green-50 border-green-200">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-700">Merge Complete!</AlertTitle>
          <AlertDescription className="text-green-600">
            Your PDF files have been successfully merged. The download should have started automatically.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
