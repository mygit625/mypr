
"use client";

import { useEffect, useRef } from 'react';
import { Globe, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function HtmlToPdfPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.getElementById('avepdf-embed-script')) {
       if (typeof (window as any).loadAvePDFWidget === 'function') {
        (window as any).loadAvePDFWidget('f6b881be-add7-47ad-b1bf-79caa7cf4730', 'auto', 'html-to-pdf', 'avepdf-container-id');
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
        (window as any).loadAvePDFWidget('f6b881be-add7-47ad-b1bf-79caa7cf4730', 'auto', 'html-to-pdf', 'avepdf-container-id');
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
        <Globe className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">HTML to PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Convert webpages in HTML to PDF. Copy and paste the URL of the page you want to convert.
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
          <h2 className="text-3xl font-bold text-center mb-8">How to Convert a Webpage to PDF</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Paste Your URL</h3>
              <p className="text-muted-foreground">Copy the full web address (URL) of the page you wish to convert and paste it into the input field.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Initiate Conversion</h3>
              <p className="text-muted-foreground">Click the "Convert" button. Our tool will fetch the webpage and render it into a high-quality PDF document.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Download the PDF</h3>
              <p className="text-muted-foreground">Your PDF will be ready in seconds. Click the download button to save the perfect snapshot of the webpage.</p>
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
              <AccordionTrigger className="text-lg text-left">Will the PDF look exactly like the website?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Our converter aims to create a pixel-perfect representation of how the webpage looks in a standard browser. However, dynamic content, ads, or pop-ups may not be included. The tool is best for converting articles and static content pages.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Can I convert a webpage that requires a login?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                No, the tool can only access publicly available webpages. It cannot log in to websites, so pages behind a password-protected area cannot be converted.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Are the links in the webpage still clickable in the PDF?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes, our HTML to PDF converter is designed to preserve hyperlinks from the original webpage, so you can still click on them in the final PDF document.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
