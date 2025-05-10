"use client";

import { useState } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Combine, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeComplete, setMergeComplete] = useState(false);
  const { toast } = useToast();

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setMergeComplete(false); // Reset completion state if new files are selected
    setMergeProgress(0);
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
    setMergeProgress(0);

    // Simulate merge process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setMergeProgress(i);
    }

    setIsMerging(false);
    setMergeComplete(true);
    toast({
      title: "Merge Successful!",
      description: "Your PDFs have been merged (simulated).",
      action: <Button variant="outline" size="sm" onClick={() => alert("Download simulated file.")}>Download</Button>,
    });
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
          <CardDescription>Select or drag and drop the PDF files you want to merge.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone onFilesSelected={handleFilesSelected} multiple accept="application/pdf" maxFiles={10} />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          {isMerging && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">Merging files...</p>
              <Progress value={mergeProgress} className="w-full" />
            </div>
          )}
          {mergeComplete && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-700">Merge Complete!</AlertTitle>
              <AlertDescription className="text-green-600">
                Your PDF files have been successfully merged (simulated).
                You can download the merged file now.
              </AlertDescription>
            </Alert>
          )}
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
                Merge PDFs
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
