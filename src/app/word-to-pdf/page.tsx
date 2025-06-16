
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import * as docx from 'docx-preview';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { FileCode, Loader2, Info, Download, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL, readFileAsArrayBuffer } from '@/lib/file-utils'; // Assuming readFileAsArrayBuffer exists
import { downloadDataUri } from '@/lib/download-utils';
import { convertWordToPdfAction } from './actions';

const PREVIEW_CONTAINER_ID = 'docx-preview-container';

export default function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedPdfUri, setConvertedPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const { toast } = useToast();
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const renderPreview = useCallback(async (docxFile: File) => {
    if (!docxFile) return;
    if (!previewContainerRef.current) {
        console.warn("Preview container not ready for DOCX preview.");
        return;
    }
    setIsLoadingPreview(true);
    setError(null);
    // Clear previous preview
    previewContainerRef.current.innerHTML = '';
    
    try {
      const arrayBuffer = await readFileAsArrayBuffer(docxFile);
      await docx.renderAsync(arrayBuffer, previewContainerRef.current, undefined, {
        className: "docx-preview-content", // for styling
        inWrapper: true, // Renders a wrapper around the content
        ignoreWidth: false, 
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true, // Attempt to show page breaks
        experimental: false,
        debug: false,
      });
    } catch (e: any) {
      console.error("Error rendering DOCX preview:", e);
      setError("Could not render preview for this DOCX file. It might be corrupted or an unsupported format.");
      previewContainerRef.current.innerHTML = '<p class="text-destructive text-center p-4">Preview not available.</p>';
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);


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
        if (previewContainerRef.current) previewContainerRef.current.innerHTML = '';
        return;
      }
      setFile(selectedFile);
      setConvertedPdfUri(null);
      setError(null);
      await renderPreview(selectedFile);
    } else {
      setFile(null);
      if (previewContainerRef.current) previewContainerRef.current.innerHTML = '';
      setError(null);
      setConvertedPdfUri(null);
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

    try {
      const wordDataUri = await readFileAsDataURL(file); // We send data URI, though action uses placeholder logic
      const result = await convertWordToPdfAction({ wordDataUri, originalFileName: file.name });

      if (result.error) {
        setError(result.error);
        toast({ title: "Conversion Error", description: result.error, variant: "destructive" });
      } else if (result.pdfDataUri) {
        setConvertedPdfUri(result.pdfDataUri);
        downloadDataUri(result.pdfDataUri, `${file.name.replace(/\.docx$/, '')}_placeholder.pdf`);
        toast({
          title: "Placeholder PDF Generated!",
          description: "A placeholder PDF has been generated and download has started.",
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
    <div className="max-w-4xl mx-auto space-y-8">
      <style jsx global>{`
        .docx-preview-content .docx-wrapper {
          background-color: white !important;
          padding: 20px !important;
          margin-bottom: 0 !important;
          box-shadow: 0 0 10px rgba(0,0,0,0.1) !important;
        }
        .docx-preview-content .docx-wrapper > section.docx {
            box-shadow: none !important;
            margin-bottom: 0 !important;
        }
        .docx-preview-content p {
          color: #333 !important; /* Example for paragraph text color */
        }
        .docx-preview-content h1, .docx-preview-content h2, .docx-preview-content h3 {
          color: #111 !important; /* Example for heading colors */
        }
      `}</style>
      <header className="text-center py-8">
        <FileCode className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Word to PDF</h1>
        <p className="text-muted-foreground mt-2">
          Upload a .docx file to preview it and convert it to a (placeholder) PDF.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upload .DOCX File</CardTitle>
          <CardDescription>Select the .docx file you want to convert. A preview will be shown below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploadZone
            onFilesSelected={handleFileSelected}
            multiple={false}
            accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
          />
          {file && (
            <div>
              <h3 className="text-lg font-medium mb-2 text-center">Document Preview</h3>
              {isLoadingPreview && (
                <div className="flex justify-center items-center h-64 border rounded-md bg-muted/50">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Loading preview...</p>
                </div>
              )}
              <div 
                id={PREVIEW_CONTAINER_ID} 
                ref={previewContainerRef} 
                className="border rounded-md bg-slate-50 min-h-[300px] max-h-[500px] overflow-y-auto p-1"
                style={{ display: isLoadingPreview ? 'none' : 'block' }}
              >
                {/* DOCX content will be rendered here by docx.renderAsync */}
                 {!isLoadingPreview && !previewContainerRef.current?.hasChildNodes() && (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <FileText size={48} className="mb-2"/>
                        <p>Preview will appear here.</p>
                        {error && <p className="text-destructive mt-2">{error}</p>}
                    </div>
                )}
              </div>
               {error && !isLoadingPreview && (
                 <Alert variant="destructive" className="mt-2 text-sm">
                    <Info className="h-4 w-4"/>
                    <AlertTitle>Preview Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                 </Alert>
               )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleConvert}
            disabled={!file || isConverting || isLoadingPreview}
            className="w-full"
            size="lg"
          >
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Convert to PDF (Placeholder)
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {convertedPdfUri && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700">Placeholder PDF Ready!</AlertTitle>
          <AlertDescription className="text-green-600">
            Your placeholder PDF has been generated. The download should have started automatically.
            <Button variant="link" size="sm" onClick={() => downloadDataUri(convertedPdfUri, `${file?.name.replace(/\.docx$/, '')}_placeholder.pdf`)} className="text-green-700 hover:text-green-800 p-0 h-auto ml-2">
              Download Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
       {error && !isConverting && !isLoadingPreview && !file && (
         <Alert variant="destructive" className="mt-4">
            <Info className="h-4 w-4"/>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}
    </div>
  );
}
