
"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Crop, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { readFileAsDataURL } from '@/lib/file-utils';

// Dynamically import the CropWorkspace component with SSR turned off.
// This is the key to preventing the server from trying to render the pdfjs-dist library.
const CropWorkspace = dynamic(() => import('./CropWorkspace'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ),
});

export default function CropPdfPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Ensure the component has mounted on the client before rendering the dynamic component
  // This helps prevent hydration mismatches with the loading skeleton.
  useState(() => {
    setIsClient(true);
  }, []);

  const handleFileSelected = async (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setPdfFile(file);
      const dataUri = await readFileAsDataURL(file);
      setPdfDataUri(dataUri);
    } else {
      setPdfFile(null);
      setPdfDataUri(null);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <Crop className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Crop PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Visually crop your PDF pages. Select an area and crop your document.
        </p>
      </header>

      {!pdfFile && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Upload PDF</CardTitle>
            <CardDescription>Select or drag a PDF file to begin cropping.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="application/pdf" />
          </CardContent>
        </Card>
      )}

      {isClient && pdfFile && pdfDataUri && (
        <CropWorkspace
          key={pdfFile.name} // Use key to force re-mount on new file
          pdfFile={pdfFile}
          pdfDataUri={pdfDataUri}
          onReset={() => {
            setPdfFile(null);
            setPdfDataUri(null);
          }}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Use Our Free Online PDF Cropper</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3>
              <p className="text-muted-foreground">Click the upload button or drag and drop your file. Your file is processed securely in your browser.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Select Your Crop Area</h3>
              <p className="text-muted-foreground">A preview of your PDF will appear. Click and drag on the page to draw a crop box. Adjust the box by dragging it.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Crop and Download</h3>
              <p className="text-muted-foreground">Choose to apply the crop to one or all pages, then click "Crop and Download".</p>
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
              <AccordionTrigger className="text-lg text-left">Is this PDF cropping tool free to use?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">Yes, absolutely. Our online PDF cropper is completely free to use. There are no hidden fees, watermarks, or sign-up requirements.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Are my uploaded files secure?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">We prioritize your privacy and security. The entire cropping process happens in your browser, and server communication is minimal. Your files are automatically deleted from our servers after one hour.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Can I crop multiple pages of a PDF at once?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">Yes. After defining your crop area, you have the option to apply that same selection to all pages in the document. This is perfect for consistently removing headers or margins.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg text-left">Will cropping a PDF reduce its quality?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">No, our tool is designed to maintain the highest possible quality. When you crop a PDF, we don't re-compress the content within your selected area. The text and images will retain their original clarity.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
