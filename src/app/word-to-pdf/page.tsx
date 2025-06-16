
"use client";

import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import * as docx from 'docx-preview';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { FileCode, Loader2, Info, Download, CheckCircle, Plus, ArrowRightCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsArrayBuffer } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { convertWordToPdfAction } from './actions';
import { cn } from '@/lib/utils';

const PREVIEW_CONTAINER_ID = 'docx-preview-container';

export default function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedPdfUri, setConvertedPdfUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const { toast } = useToast();
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderPreview = useCallback(async (docxFile: File) => {
    if (!docxFile) return;
    if (!previewContainerRef.current) {
        console.warn("Preview container not ready for DOCX preview.");
        setIsLoadingPreview(false); // Ensure loading state is reset
        return;
    }
    setIsLoadingPreview(true);
    setError(null);
    previewContainerRef.current.innerHTML = '';

    try {
      const arrayBuffer = await readFileAsArrayBuffer(docxFile);
      await docx.renderAsync(arrayBuffer, previewContainerRef.current, undefined, {
        className: "docx-preview-content",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        experimental: false,
        debug: false,
        useMathMLPolyfill: true,
      });
    } catch (e: any) {
      console.error("Error rendering DOCX preview:", e);
      setError("Could not render preview. The DOCX file might be corrupted or use unsupported features.");
      if (previewContainerRef.current) {
        previewContainerRef.current.innerHTML = '<p class="text-destructive text-center p-4">Preview not available for this file.</p>';
      }
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
        setError(null); // Clear previous errors
        setConvertedPdfUri(null); // Clear previous conversion results
        return;
      }
      setFile(selectedFile);
      setConvertedPdfUri(null);
      setError(null);
      // Only call renderPreview if the ref is available
      if (previewContainerRef.current) {
         await renderPreview(selectedFile);
      } else {
        // If ref is not available yet, wait for next render cycle
        // This might happen on initial load if file is pre-selected
        setIsLoadingPreview(true); // Show loading until preview can be rendered
      }
    } else {
      setFile(null);
      if (previewContainerRef.current) previewContainerRef.current.innerHTML = '';
      setError(null);
      setConvertedPdfUri(null);
    }
  };
  
  // Effect to render preview if file is set and previewContainerRef becomes available
  useEffect(() => {
    if (file && previewContainerRef.current && isLoadingPreview) {
        renderPreview(file);
    }
  }, [file, isLoadingPreview, renderPreview]);


  const handleFileChangeFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFileSelected(Array.from(event.target.files));
    }
     // Reset the file input value to allow selecting the same file again
    if (event.target) {
      event.target.value = "";
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
    toast({ title: "Processing Document", description: "Converting your Word document to PDF..." });

    try {
      const docxFileArrayBuffer = await readFileAsArrayBuffer(file);
      const docxFileBase64 = Buffer.from(docxFileArrayBuffer).toString('base64');

      const result = await convertWordToPdfAction({ docxFileBase64, originalFileName: file.name });

      if (result.error) {
        setError(result.error);
        toast({ title: "Conversion Error", description: result.error, variant: "destructive" });
      } else if (result.pdfDataUri) {
        setConvertedPdfUri(result.pdfDataUri);
        downloadDataUri(result.pdfDataUri, `${file.name.replace(/\.docx$/, '')}.pdf`);
        toast({
          title: "Conversion Successful!",
          description: "Word document converted to PDF.",
          variant: "default",
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
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-0"> {/* Added padding for small screens */}
      <style jsx global>{`
        .docx-preview-content .docx-wrapper {
          background-color: transparent !important;
          padding: 0px !important;
          margin-bottom: 0 !important;
          box-shadow: none !important;
        }
        .docx-preview-content .docx-wrapper > section.docx {
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1) !important; /* Softer shadow */
          margin: 10px auto !important;
          background-color: white !important;
          overflow: visible !important; /* Allow content to not be clipped if needed */
          max-width: 100%; /* Ensure it fits parent */
        }
        .docx-preview-content p { color: #333 !important; }
        .docx-preview-content h1, .docx-preview-content h2, .docx-preview-content h3 { color: #111 !important; }
      `}</style>
      <header className="text-center pt-8 pb-4">
        <FileCode className="mx-auto h-12 w-12 text-primary mb-3" />
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Word to PDF</h1>
        <p className="text-muted-foreground mt-2 text-base md:text-lg">
          Upload your .docx file to convert it into a PDF document.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left Panel: File Upload / Preview */}
        <div className="lg:w-2/3 relative min-h-[400px] lg:min-h-[500px] flex flex-col items-center justify-center bg-card border rounded-lg shadow-md p-4 sm:p-6">
          {!file && !isLoadingPreview && (
            <div className="w-full max-w-md">
              <FileUploadZone
                onFilesSelected={handleFileSelected}
                multiple={false}
                accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
            </div>
          )}
          {(file || isLoadingPreview) && (
            <>
              {isLoadingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-20 rounded-lg">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading preview...</p>
                  </div>
              )}
              <div
                id={PREVIEW_CONTAINER_ID}
                ref={previewContainerRef}
                className={cn(
                    "w-full h-full flex-grow border rounded-md bg-slate-50 dark:bg-slate-800 overflow-y-auto p-1 min-h-[300px]",
                    isLoadingPreview && "opacity-50" // Dim preview while loading
                )}
                // Ensure parent has defined height for h-full to work or set explicit height
              >
                {!isLoadingPreview && !previewContainerRef.current?.hasChildNodes() && !error && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                        <FileCode size={48} className="mb-2"/>
                        <p>Preview will appear here.</p>
                        {file && <p className="text-xs mt-1">File: {file.name}</p>}
                    </div>
                )}
              </div>
            </>
          )}
          {error && !isLoadingPreview && previewContainerRef.current && !previewContainerRef.current.hasChildNodes() && (
             <Alert variant="destructive" className="mt-4 w-full max-w-md text-sm">
                <Info className="h-4 w-4"/>
                <AlertTitle>Preview Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
             </Alert>
           )}
          <Button
            variant="default"
            size="icon"
            className="absolute top-3 right-3 lg:top-4 lg:right-4 h-10 w-10 lg:h-12 lg:w-12 rounded-full shadow-lg z-10"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add or change DOCX file"
            title="Upload or change DOCX file"
          >
            <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChangeFromInput}
            accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />
        </div>

        {/* Right Panel: Options & Action */}
        <div className="lg:w-1/3">
          <Card className="shadow-lg h-full flex flex-col sticky top-24"> {/* Added sticky top for consistent positioning */}
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-semibold">Word to PDF</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How to Convert</AlertTitle>
                <AlertDescription>
                  1. Upload your .docx file using the panel on the left or the '+' button.
                  2. A preview of your document will be displayed.
                  3. Click the "Convert to PDF" button below to start the conversion.
                  The resulting PDF will extract text and images. Font styles and complex layouts may be simplified.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="mt-auto border-t pt-6 pb-6">
              <Button
                onClick={handleConvert}
                disabled={!file || isConverting || isLoadingPreview}
                className="w-full text-base md:text-lg py-3"
                size="lg"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <ArrowRightCircle className="mr-2 h-5 w-5" />
                    Convert to PDF
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {convertedPdfUri && !error && (
        <Alert variant="default" className="bg-green-50 border-green-200 mt-8 max-w-lg mx-auto">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700">PDF Ready!</AlertTitle>
          <AlertDescription className="text-green-600">
            Your Word document has been converted. Download should have started.
            <Button variant="link" size="sm" onClick={() => downloadDataUri(convertedPdfUri, `${file?.name.replace(/\.docx$/, '')}.pdf`)} className="text-green-700 hover:text-green-800 p-0 h-auto ml-1 underline">
              Download Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
       {error && !isConverting && !isLoadingPreview && !previewContainerRef.current?.hasChildNodes() && (
         <Alert variant="destructive" className="mt-8 max-w-lg mx-auto">
            <Info className="h-4 w-4"/>
            <AlertTitle>Process Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}
    </div>
  );
}

    