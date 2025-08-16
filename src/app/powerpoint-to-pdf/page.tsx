
"use client";

import { useEffect, useRef } from 'react';
import { Presentation, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function PowerPointToPdfPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the script has already been added to avoid duplicates
    if (document.getElementById('avepdf-embed-script')) {
      // If script exists, but widget isn't loaded, try to load widget again.
      // This handles navigation back and forth.
       if (typeof (window as any).loadAvePDFWidget === 'function') {
        (window as any).loadAvePDFWidget('d9263667-adce-41ec-880e-26b4371a4fb0', 'auto', 'pptx-to-pdf', 'avepdf-container-id');
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
        (window as any).loadAvePDFWidget('d9263667-adce-41ec-880e-26b4371a4fb0', 'auto', 'pptx-to-pdf', 'avepdf-container-id');
      }
    };
    
    // Append the script to the body to start loading it
    document.body.appendChild(script);

    // No cleanup needed, we want the script to persist across navigations
    return () => {};
  }, []); // Empty dependency array ensures this effect runs only once

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
        <Presentation className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">PowerPoint to PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Convert your PPTX or PPT files to PDF.
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
          <h2 className="text-3xl font-bold text-center mb-8">How to Convert PowerPoint to PDF</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Presentation</h3>
              <p className="text-muted-foreground">Select your PPT or PPTX file by clicking the upload area or dragging it onto the page.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Convert Automatically</h3>
              <p className="text-muted-foreground">The conversion starts instantly, transforming your slides into PDF pages while preserving layouts and images.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Download PDF</h3>
              <p className="text-muted-foreground">Your new PDF document is ready for download in just a few moments, perfectly formatted for sharing.</p>
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
              <AccordionTrigger className="text-lg text-left">Will my animations and transitions be converted?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                No, PDF is a static format and does not support PowerPoint's animations, transitions, or embedded media like videos. The conversion will save the final appearance of each slide as a static page in the PDF.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">How are speaker notes handled?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Standard PowerPoint to PDF converters typically do not include speaker notes in the final PDF. The output will only contain the visual content of the slides themselves.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Why should I convert my presentation to PDF?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Converting to PDF ensures your presentation can be viewed by anyone, on any device, without needing Microsoft PowerPoint. It locks the formatting, making it perfect for sharing as a handout, archiving, or ensuring a consistent viewing experience.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
