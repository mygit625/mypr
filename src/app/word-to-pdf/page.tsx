
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import * as docx from 'docx-preview';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { FileCode, Loader2, Info, Download, FileText, ExternalLink, Image, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsArrayBuffer } from '@/lib/file-utils';
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
  const [isCapturingImages, setIsCapturingImages] = useState(false);

  const renderPreview = useCallback(async (docxFile: File) => {
    if (!docxFile) return;
    if (!previewContainerRef.current) {
        console.warn("Preview container not ready for DOCX preview.");
        return;
    }
    setIsLoadingPreview(true);
    setError(null);
    previewContainerRef.current.innerHTML = ''; // Clear previous preview
    
    try {
      const arrayBuffer = await readFileAsArrayBuffer(docxFile);
      await docx.renderAsync(arrayBuffer, previewContainerRef.current, undefined, {
        className: "docx-preview-content",
        inWrapper: true,
        ignoreWidth: false, 
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true, // Important for page segmentation
        experimental: false,
        debug: false,
        useMathMLPolyfill: true, // To render equations if any
      });
    } catch (e: any) {
      console.error("Error rendering DOCX preview:", e);
      setError("Could not render preview. The DOCX file might be corrupted or use unsupported features.");
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
    if (!file || !previewContainerRef.current) {
      toast({
        title: "No file or preview",
        description: "Please select a .docx file and ensure its preview is loaded.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    setIsCapturingImages(true);
    setConvertedPdfUri(null);
    setError(null);
    toast({ title: "Processing Document", description: "Capturing page images, this may take a moment..." });

    try {
      const pageElements = Array.from(
        previewContainerRef.current.querySelectorAll('.docx-preview-content .docx')
      ) as HTMLElement[];

      if (pageElements.length === 0) {
        throw new Error("Could not find rendered pages in the preview. Ensure the DOCX rendered correctly.");
      }
      
      const pageImageUris: string[] = [];
      for (let i = 0; i < pageElements.length; i++) {
        const element = pageElements[i];
        try {
            const canvas = await html2canvas(element, {
            scale: 2, // Increase scale for better quality
            useCORS: true, // If images are from external sources
            logging: false,
            });
            pageImageUris.push(canvas.toDataURL('image/jpeg', 0.9)); // Use JPEG for smaller size
            toast({ description: `Captured page ${i + 1} of ${pageElements.length}`});
        } catch (canvasError: any) {
            console.error(`Error capturing page ${i+1} with html2canvas:`, canvasError);
            // Optionally skip this page or add a placeholder error image
            toast({title: "Page Capture Error", description: `Could not capture page ${i+1}. It will be skipped.`, variant: "destructive"});
        }
      }
      setIsCapturingImages(false);

      if (pageImageUris.length === 0) {
        throw new Error("No page images could be captured from the document.");
      }

      toast({ title: "Finalizing PDF", description: "Sending images to create your PDF..." });
      const result = await convertWordToPdfAction({ pageImageUris, originalFileName: file.name });

      if (result.error) {
        setError(result.error);
        toast({ title: "Conversion Error", description: result.error, variant: "destructive" });
      } else if (result.pdfDataUri) {
        setConvertedPdfUri(result.pdfDataUri);
        downloadDataUri(result.pdfDataUri, `${file.name.replace(/\.docx$/, '')}.pdf`);
        toast({
          title: "Conversion Successful!",
          description: "Your Word document has been converted to an image-based PDF.",
          variant: "default", // Use default for success
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during conversion.";
      setError(errorMessage);
      toast({ title: "Conversion Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsConverting(false);
      setIsCapturingImages(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <style jsx global>{`
        .docx-preview-content .docx-wrapper {
          background-color: transparent !important; /* Allow parent bg to show */
          padding: 0px !important; /* Minimal padding */
          margin-bottom: 0 !important;
          box-shadow: none !important; /* Remove wrapper shadow */
        }
        .docx-preview-content .docx-wrapper > section.docx {
          box-shadow: 0 0 10px rgba(0,0,0,0.15) !important; /* Shadow per page */
          margin: 10px auto !important; /* Spacing between pages */
          background-color: white !important; /* White background for each page */
          overflow: hidden; /* Ensure content stays within page bounds */
          max-width: 100%; /* Ensure it's responsive within its container */
        }
        .docx-preview-content p { color: #333 !important; }
        .docx-preview-content h1, .docx-preview-content h2, .docx-preview-content h3 { color: #111 !important; }
      `}</style>
      <header className="text-center py-8">
        <FileCode className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Word to PDF (as Images)</h1>
        <p className="text-muted-foreground mt-2">
          Upload a .docx file to preview it and convert it to a PDF where each page is an image.
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
                className="border rounded-md bg-slate-100 dark:bg-slate-800 min-h-[300px] max-h-[500px] overflow-y-auto p-1"
                style={{ display: isLoadingPreview ? 'none' : 'block' }}
              >
                 {!isLoadingPreview && !previewContainerRef.current?.hasChildNodes() && !error && (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <FileText size={48} className="mb-2"/>
                        <p>Preview will appear here once the file is processed.</p>
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
                {isCapturingImages ? "Capturing Pages..." : "Converting..."}
              </>
            ) : (
              <>
                <Image className="mr-2 h-4 w-4" />
                Convert to Image PDF
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {convertedPdfUri && !error && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700">PDF Ready!</AlertTitle>
          <AlertDescription className="text-green-600">
            Your Word document has been converted. The download should have started.
            <Button variant="link" size="sm" onClick={() => downloadDataUri(convertedPdfUri, `${file?.name.replace(/\.docx$/, '')}.pdf`)} className="text-green-700 hover:text-green-800 p-0 h-auto ml-2">
              Download Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
       {error && !isConverting && ( // Show general error if not converting and error exists
         <Alert variant="destructive" className="mt-4">
            <Info className="h-4 w-4"/>
            <AlertTitle>Conversion Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}
    </div>
  );
}
