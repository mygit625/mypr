"use client";

import { useState } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, SplitSquareHorizontal, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitProgress, setSplitProgress] = useState(0);
  const [splitComplete, setSplitComplete] = useState(false);
  const { toast } = useToast();

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile(selectedFiles[0]);
    } else {
      setFile(null);
    }
    setSplitComplete(false); // Reset completion state if new file is selected
    setSplitProgress(0);
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
    setSplitProgress(0);

    // Simulate split process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setSplitProgress(i);
    }

    setIsSplitting(false);
    setSplitComplete(true);
    toast({
      title: "Split Successful!",
      description: "Your PDF has been split (simulated).",
      action: <Button variant="outline" size="sm" onClick={() => alert("Download simulated split files (e.g., as a ZIP).")}>Download Files</Button>,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <SplitSquareHorizontal className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Split PDF File</h1>
        <p className="text-muted-foreground mt-2">
          Divide your PDF document into multiple smaller files. Upload your file below.
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
          {isSplitting && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">Splitting file...</p>
              <Progress value={splitProgress} className="w-full" />
            </div>
          )}
          {splitComplete && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-700">Split Complete!</AlertTitle>
              <AlertDescription className="text-green-600">
                Your PDF file has been successfully split (simulated).
                You can download the split files now.
              </AlertDescription>
            </Alert>
          )}
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
    </div>
  );
}
