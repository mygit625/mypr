"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crop, FileUp, MousePointerClick, DownloadCloud, HelpCircle, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { readFileAsDataURL } from '@/lib/file-utils';
import { useToast } from '@/hooks/use-toast';
import { createPdfFromImagesAction } from './actions';
import { downloadDataUri } from '@/lib/download-utils';

// Dynamically import the workspace component to ensure pdfjs-dist is not bundled on the server.
const CropWorkspace = dynamic(() => import('./CropWorkspace'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-8 h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Cropping Tool...</p>
    </div>
  )
});

export default function CropPdfPage() {
  const [fileData, setFileData] = useState<{name: string; dataUri: string} | null>(null);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelected = async (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setIsProcessing(true);
      try {
        const dataUri = await readFileAsDataURL(file);
        setFileData({ name: file.name, dataUri });
      } catch (e: any) {
        toast({ title: "File Error", description: `Could not read file: ${e.message}`, variant: "destructive"});
        setFileData(null);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setFileData(null);
    }
  };

  const handleReset = () => {
    setFileData(null);
  };
  
  const handleCropComplete = async ({ imageDataUris, originalFileName }: { imageDataUris: string[]; originalFileName: string }) => {
    setIsProcessing(true);
    try {
      const result = await createPdfFromImagesAction({ imageDataUris });
      if (result.error) {
        throw new Error(result.error);
      }
      if (result.createdPdfDataUri) {
        downloadDataUri(result.createdPdfDataUri, `cropped_${originalFileName}`);
        toast({
            title: 'Success!',
            description: 'Your cropped PDF has been downloaded.',
        });
        handleReset(); // Reset the interface after successful download
      }
    } catch (e: any) {
       toast({
        title: "Error Creating PDF",
        description: e.message || 'An unexpected error occurred.',
        variant: 'destructive'
       });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center py-8">
        <Crop className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Crop PDF</h1>
        <p className="text-muted-foreground mt-2">Crop your PDF pages by selecting a visual area.</p>
      </header>
      
      {!fileData ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>Select or drag a PDF file to begin cropping.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
          </CardContent>
        </Card>
      ) : (
        <CropWorkspace 
          pdfDataUri={fileData.dataUri} 
          fileName={fileData.name} 
          onReset={handleReset} 
          onCropComplete={handleCropComplete}
          isProcessing={isProcessing}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Use Our Free Online PDF Cropper</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center"><div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4"><FileUp className="h-8 w-8" /></div><h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3><p className="text-muted-foreground">Click the upload button or drag and drop your file into the designated area. Your file is processed securely.</p></div>
            <div className="flex flex-col items-center"><div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4"><MousePointerClick className="h-8 w-8" /></div><h3 className="text-xl font-semibold mb-2">2. Select Your Crop Area</h3><p className="text-muted-foreground">A preview of your PDF page will appear. Click and drag on the page to draw a crop box. Adjust the box by dragging its edges and corners.</p></div>
            <div className="flex flex-col items-center"><div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4"><DownloadCloud className="h-8 w-8" /></div><h3 className="text-xl font-semibold mb-2">3. Crop and Download</h3><p className="text-muted-foreground">Choose to apply the crop to a single page or all pages, then click the "Crop PDF" button. Download your perfectly cropped PDF instantly.</p></div>
          </div>
        </section>
        <section>
          <div className="text-center mb-12"><HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" /><h2 className="text-3xl font-bold">Frequently Asked Questions</h2></div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1"><AccordionTrigger className="text-lg text-left">Is this PDF cropping tool free to use?</AccordionTrigger><AccordionContent className="text-base text-muted-foreground">Yes, absolutely. Our online PDF cropper is completely free to use. There are no hidden fees, watermarks, or sign-up requirements. You can crop as many PDF files as you need.</AccordionContent></AccordionItem>
            <AccordionItem value="item-2"><AccordionTrigger className="text-lg text-left">Are my uploaded files secure?</AccordionTrigger><AccordionContent className="text-base text-muted-foreground">We prioritize your privacy and security. The entire cropping process happens securely on our servers, and your files are automatically deleted after one hour.</AccordionContent></AccordionItem>
            <AccordionItem value="item-3"><AccordionTrigger className="text-lg text-left">Can I crop multiple pages of a PDF at once?</AccordionTrigger><AccordionContent className="text-base text-muted-foreground">Yes, you can. After defining your crop area on a single page, you have the option to apply that same crop selection to all pages in the document. This is perfect for consistently removing headers, footers, or margins from an entire file.</AccordionContent></AccordionItem>
            <AccordionItem value="item-4"><AccordionTrigger className="text-lg text-left">Will cropping a PDF reduce its quality?</AccordionTrigger><AccordionContent className="text-base text-muted-foreground">No, our tool is designed to maintain the highest possible quality. When you crop a PDF, we don't re-compress the content within your selected area. The text, images, and graphics will retain their original clarity and resolution.</AccordionContent></AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
