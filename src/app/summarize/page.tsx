
"use client";

import { useState } from 'react';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Loader2, Info, Copy, Download, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { summarizePdfAction } from './actions';
import { downloadDataUri } from '@/lib/download-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


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

  const copyToClipboard = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    toast({ description: "Summary copied to clipboard!" });
  };

  const downloadAsTxt = () => {
    if (!summary || !file) return;
    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    downloadDataUri(url, `summary_${file.name.replace(/\.pdf$/i, '')}.txt`);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center py-8">
        <FileText className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Summarize PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Get an AI-powered summary of your PDF document. Upload your file below to get the key points in seconds.
        </p>
      </header>

      {!summary && (
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
      )}

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
           <CardFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={copyToClipboard} variant="outline" className="w-full">
              <Copy className="mr-2 h-4 w-4" /> Copy Summary
            </Button>
            <Button onClick={downloadAsTxt} className="w-full">
              <Download className="mr-2 h-4 w-4" /> Download .txt
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Summarize a PDF</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3>
              <p className="text-muted-foreground">Select or drag your PDF file into the upload area. The tool will prepare it for analysis by our secure AI.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Start Summarization</h3>
              <p className="text-muted-foreground">Click the "Summarize PDF" button. The AI will read your document and extract the most important points and concepts.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Get Your Summary</h3>
              <p className="text-muted-foreground">Your concise summary will appear in seconds. You can then copy it to your clipboard or download it as a text file.</p>
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
              <AccordionTrigger className="text-lg text-left">Is this PDF summarizer tool free?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes, our AI-powered PDF summarizer is completely free to use. There are no subscriptions or hidden fees involved.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">How long can the PDF be?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Our tool can handle multi-page documents. However, for the best performance and to stay within context limits of the AI model, we recommend using PDFs of a reasonable length (e.g., up to 50 pages). Very large documents may take longer to process.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Is my uploaded document secure?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Your privacy is paramount. Your document is sent securely to the AI for processing and is not stored on our servers. All uploaded files are automatically deleted after one hour.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">Unlock Key Insights with Our AI PDF Summarizer</h2>
            <p>In a world overflowing with information, the ability to quickly grasp the essence of a document is a superpower. Our AI PDF Summarizer is designed to give you that edge. Whether you're a student tackling dense academic papers, a professional reviewing lengthy business reports, or simply someone looking to understand a document without reading every word, our tool is for you.</p>
            <h3>Why Use an AI Summarizer?</h3>
            <ul>
              <li><strong>Save Time:</strong> Get the core message of a long document in a fraction of the time it would take to read it fully.</li>
              <li><strong>Improve Comprehension:</strong> By focusing on the main ideas, a summary can improve your understanding of the document's key arguments and conclusions.</li>
              <li><strong>Boost Productivity:</strong> Quickly evaluate whether a document is relevant to your work or research without getting bogged down in the details.</li>
            </ul>
            <p>Our tool leverages advanced large language models to analyze the text, identify the main topics, and generate a concise, coherent summary. It's more than just extracting sentences; it's about understanding and condensing information intelligently. Upload your PDF today and experience a smarter way to read.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
