
"use client";

import { useState } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { summarizePdfAction } from './actions';


export default function SummarizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelected = (selectedFiles: File[]) => {
    if (selectedFiles.length > 0) {
      setFile(selectedFiles[0]);
    } else {
      setFile(null);
    }
    setSummary(null); // Reset summary if new file is selected
    setError(null);
  };

  const handleSummarize = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to summarize.",
        variant: "destructive",
      });
      return;
    }

    setIsSummarizing(true);
    setSummary(null);
    setError(null);

    try {
      const pdfDataUri = await readFileAsDataURL(file);
      const result = await summarizePdfAction({ pdfDataUri });

      if ('error' in result) {
        setError(result.error);
        toast({
          title: "Summarization Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        setSummary(result.summary);
        toast({
          title: "Summarization Complete!",
          description: "Your PDF has been summarized successfully.",
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during summarization.";
      setError(errorMessage);
      toast({
        title: "Summarization Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <FileText className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Summarize PDF</h1>
        <p className="text-muted-foreground mt-2">
          Get an AI-powered summary of your PDF document. Upload your file below.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>Select or drag and drop the PDF file you want to summarize.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSummarize}
            disabled={!file || isSummarizing}
            className="w-full"
            size="lg"
          >
            {isSummarizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Summarize PDF
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {summary && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Here is the AI-generated summary of your document:</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60 w-full rounded-md border p-4">
              <p className="text-sm whitespace-pre-wrap">{summary}</p>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
