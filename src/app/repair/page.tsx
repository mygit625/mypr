
"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Wrench, Loader2, Info, Download, CheckCircle, XCircle, FileType, X, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { repairPdfAction } from './actions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
          description: "The PDF has been processed. You can now download your file.",
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
    <div className="max-w-2xl mx-auto space-y-8">
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
          <CardContent>
            {!file ? (
                <FileUploadZone
                  onFilesSelected={handleFileSelectedForUploadZone}
                  multiple={false}
                  accept="application/pdf"
                />
            ) : (
                <div className="mt-4 border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileType className="h-8 w-8 text-primary" />
                        <div>
                            <p className="font-medium truncate max-w-xs" title={file.name}>{file.name}</p>
                            <p className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                        <X className="h-5 w-5"/>
                    </Button>
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
                    The PDF has been processed. You can now download the file to verify the repair.
                  </AlertDescription>
                </Alert>
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

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Repair a PDF</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Corrupt PDF</h3>
              <p className="text-muted-foreground">Select the damaged PDF file you want to fix. Your file is uploaded securely, and our system will begin to analyze it immediately.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Start Repair Process</h3>
              <p className="text-muted-foreground">Click the "Repair PDF" button. Our tool will automatically attempt to identify and fix structural issues within the document.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Download Repaired File</h3>
              <p className="text-muted-foreground">If the repair is successful, a download link will appear. Download your recovered PDF file and check its contents.</p>
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
              <AccordionTrigger className="text-lg text-left">What kind of PDF corruption can this tool fix?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                This tool is designed to fix common structural issues, such as corrupted headers, invalid cross-reference tables, or damaged objects within the PDF. It rebuilds the document's structure, which can often make an unreadable file accessible again.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Is the repair process guaranteed to work?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                While our tool is powerful, it cannot guarantee a 100% success rate. The outcome depends on the severity and type of corruption. It has a high success rate for common issues but may not be able to recover data from severely damaged files or files that are not valid PDFs.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Are my files safe during the repair process?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes, your privacy is our priority. We use a secure connection for all uploads, and your files are automatically deleted from our servers one hour after processing. We never access or share your content.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">Recovering Your Damaged PDF Files</h2>
            <p>A corrupted PDF file can be a major source of frustration, especially when it contains important information. Files can become damaged for various reasons, including incomplete downloads, software crashes, or storage device failures. Our online PDF repair tool provides a first line of defense, offering a free and easy way to attempt data recovery.</p>
            <h3>Common Causes of PDF Corruption</h3>
            <ul>
              <li><strong>Incomplete Downloads:</strong> If your internet connection drops while downloading a PDF, the file may be incomplete and unreadable.</li>
              <li><strong>Hard Drive Errors:</strong> Bad sectors or other failures on a hard drive or flash drive can corrupt parts of a stored PDF file.</li>
              <li><strong>Software Malfunctions:</strong> A crash in your PDF viewer or editor while a file is open and being written to can lead to corruption.</li>
              <li><strong>File Transfer Issues:</strong> Errors during the transfer of a file, such as from a USB drive or over a network, can introduce data corruption.</li>
            </ul>
            <p>Our tool works by analyzing the underlying structure of your uploaded PDF. It attempts to identify the valid parts of the document and rebuild the file around them, discarding the corrupted data. While this may not always recover every single element, it can often restore the majority of the text and images, saving you from a complete data loss. Give it a try—it's a fast, free, and secure way to bring your important documents back to life.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
