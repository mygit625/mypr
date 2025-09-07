
"use client";

import { useEffect, useRef } from 'react';
import { Crop, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function CropPdfPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the script has already been added to avoid duplicates
    if (document.getElementById('avepdf-embed-script')) {
      // If script exists, but widget isn't loaded, try to load widget again.
      // This handles navigation back and forth.
       if (typeof (window as any).loadAvePDFWidget === 'function') {
        (window as any).loadAvePDFWidget('d9263667-adce-41ec-880e-26b4371a4fb0', 'auto', 'pdf-crop', 'avepdf-container-id');
       }
      return;
    }

    const script = document.createElement('script');
    script.id = 'avepdf-embed-script';
    script.src = 'https://avepdf.com/api/js/embedwidgets.js';
    script.type = 'text/javascript';
    script.async = true;

    script.onload = () => {
      // The script has loaded, now we can call the function it provides
      if (typeof (window as any).loadAvePDFWidget === 'function') {
        (window as any).loadAvePDFWidget('d9263667-adce-41ec-880e-26b4371a4fb0', 'auto', 'pdf-crop', 'avepdf-container-id');
      }
    };
    
    // Append the script to the body to start loading it
    document.body.appendChild(script);

    // No cleanup needed, we want the script to persist across navigations
    return () => {};
  }, []);

  const customCss = `
    #avepdf-container-id {
      padding: 0px;
      height: 600px;
      border: 0px solid lime;
      overflow: hidden !important;
      margin-bottom: -131px;
    }
    
    hr.watermark-cover {
      display: block;
      background-color: var(--background-hsl);
      height: 93px;
      border-style: none;
      margin-top: -60px;
      position: relative;
      z-index: 1;
    }

    body:not(.dark) hr.watermark-cover {
      --background-hsl: #FFFFFF;
    }

    body.dark hr.watermark-cover {
      --background-hsl: hsl(240 10% 3.9%);
    }
  `;

  return (
    <div className="max-w-full mx-auto space-y-8">
      <style dangerouslySetInnerHTML={{ __html: customCss }} />
      <header className="text-center py-8">
        <Crop className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Crop PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Visually crop your PDF pages. Select an area and crop your document.
        </p>
      </header>
      <section>
        <div id="avepdf-container-id" ref={widgetContainerRef}>
          {/* AvePDF widget will be loaded here by the script */}
        </div>
        <hr className="watermark-cover" />
      </section>

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How to Use Our Free Online PDF Cropper</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3>
              <p className="text-muted-foreground">Click the upload button or drag and drop your file into the designated area. Your file is processed securely.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Select Your Crop Area</h3>
              <p className="text-muted-foreground">A preview of your PDF page will appear. Click and drag on the page to draw a crop box. Adjust the box by dragging its edges and corners.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Crop and Download</h3>
              <p className="text-muted-foreground">Choose to apply the crop to a single page or all pages, then click the "Crop PDF" button. Download your perfectly cropped PDF instantly.</p>
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
              <AccordionContent className="text-base text-muted-foreground">Yes, absolutely. Our online PDF cropper is completely free to use. There are no hidden fees, watermarks, or sign-up requirements. You can crop as many PDF files as you need.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Are my uploaded files secure?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">We prioritize your privacy and security. The entire cropping process happens securely on our servers, and your files are automatically deleted after one hour.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Can I crop multiple pages of a PDF at once?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">Yes, you can. After defining your crop area on a single page, you have the option to apply that same crop selection to all pages in the document. This is perfect for consistently removing headers, footers, or margins from an entire file.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg text-left">Will cropping a PDF reduce its quality?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">No, our tool is designed to maintain the highest possible quality. When you crop a PDF, we don't re-compress the content within your selected area. The text, images, and graphics will retain their original clarity and resolution.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
