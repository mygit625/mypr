
"use client";

import { useEffect, useRef } from 'react';
import { Archive, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function PdfToPdfAPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.getElementById('avepdf-embed-script')) {
       if (typeof (window as any).loadAvePDFWidget === 'function') {
        (window as any).loadAvePDFWidget('d9263667-adce-41ec-880e-26b4371a4fb0', 'auto', 'convert-to-pdfa', 'avepdf-container-id');
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
        (window as any).loadAvePDFWidget('d9263667-adce-41ec-880e-26b4371a4fb0', 'auto', 'convert-to-pdfa', 'avepdf-container-id');
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
        <Archive className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">PDF to PDF/A</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Convert your PDF files to PDF/A, the standard for long-term document archiving.
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
          <h2 className="text-3xl font-bold text-center mb-8">How to Convert to PDF/A</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3>
              <p className="text-muted-foreground">Select the PDF file you wish to convert to the PDF/A format for long-term preservation.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Select Standard & Convert</h3>
              <p className="text-muted-foreground">Choose the desired PDF/A conformance level. The tool then converts your file to meet archival standards.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Download Archival PDF</h3>
              <p className="text-muted-foreground">Your PDF/A-compliant file is ready for download, ensuring it remains accessible and readable for years to come.</p>
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
              <AccordionTrigger className="text-lg text-left">What is PDF/A and why do I need it?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                PDF/A is an ISO-standardized version of PDF specialized for long-term archiving of electronic documents. It ensures that the document will look exactly the same in the future by embedding all necessary information like fonts and color profiles directly into the file. It's often required by libraries, archives, and government institutions.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">What is the difference between PDF/A-1b, PDF/A-2b, etc.?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                These are different conformance levels of the PDF/A standard. PDF/A-1b is the most basic level, ensuring the document is visually reproducible. Higher levels like PDF/A-2b and PDF/A-3b add support for more modern PDF features like JPEG 2000 compression and layers, while still guaranteeing long-term preservation. For most users, the recommended level is sufficient.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">What features are not allowed in PDF/A?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                To ensure long-term stability, PDF/A prohibits certain features that rely on external sources or are not self-contained. This includes audio and video content, JavaScript, and font linking (all fonts must be embedded). Our tool will automatically handle these restrictions during conversion.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
