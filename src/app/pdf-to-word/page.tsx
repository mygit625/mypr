
"use client";

import { useEffect, useRef } from 'react';
import { FileCode, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function PdfToWordPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.getElementById('avepdf-embed-script')) {
       if (typeof (window as any).loadAvePDFWidget === 'function') {
        (window as any).loadAvePDFWidget('f6b881be-add7-47ad-b1bf-79caa7cf4730', 'auto', 'pdf-to-word', 'avepdf-container-id');
       }
      return;
    }

    const script = document.createElement('script');
    script.id = 'avepdf-embed-script';
    script.src = 'https://avepdf.com/api/js/embedwidgets.js';
    script.type = 'text/javascript';
    script.async = true;

    script.onload = () => {
      if (typeof (window as any).loadAvePDFWidget === 'function') {
        (window as any).loadAvePDFWidget('f6b881be-add7-47ad-b1bf-79caa7cf4730', 'auto', 'pdf-to-word', 'avepdf-container-id');
      }
    };
    
    document.body.appendChild(script);

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
        <FileCode className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">PDF to Word</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Convert your PDF files into editable DOC and DOCX documents.
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
          <h2 className="text-3xl font-bold text-center mb-8">How to Convert PDF to Word</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3>
              <p className="text-muted-foreground">Select or drag your PDF file into the upload area. Our tool will instantly begin processing the file.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Convert with OCR</h3>
              <p className="text-muted-foreground">Our powerful engine, with OCR, converts your PDF into an editable Word document, preserving the layout.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Download Your DOCX</h3>
              <p className="text-muted-foreground">Your new Word file is ready for download. Edit, update, and share your document with ease.</p>
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
              <AccordionTrigger className="text-lg text-left">How accurate is the conversion from PDF to Word?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Our converter uses advanced technology to provide the highest accuracy possible, aiming to retain the original document's layout, text, images, and tables. However, very complex PDFs may have minor formatting differences.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Can I convert a scanned PDF to an editable Word file?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes. Our tool includes Optical Character Recognition (OCR) capabilities, which can extract text from scanned, image-based PDFs and convert it into editable text in the final Word document.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Is there a file size limit for conversion?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                While our tool is robust, we recommend using files under 50MB for the best performance. Larger or more complex files may take longer to convert.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
