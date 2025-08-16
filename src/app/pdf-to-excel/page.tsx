
"use client";

import { useEffect, useRef } from 'react';
import { FileSpreadsheet, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function PdfToExcelPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.getElementById('avepdf-embed-script')) {
       if (typeof (window as any).loadAvePDFWidget === 'function') {
        (window as any).loadAvePDFWidget('f6b881be-add7-47ad-b1bf-79caa7cf4730', 'auto', 'pdf-to-excel', 'avepdf-container-id');
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
        (window as any).loadAvePDFWidget('f6b881be-add7-47ad-b1bf-79caa7cf4730', 'auto', 'pdf-to-excel', 'avepdf-container-id');
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
        <FileSpreadsheet className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">PDF to Excel</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Pull data straight from PDFs into Excel spreadsheets in a few clicks.
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
          <h2 className="text-3xl font-bold text-center mb-8">How to Convert PDF to Excel</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your PDF</h3>
              <p className="text-muted-foreground">Select or drag your PDF containing tabular data. Our tool works best with native, not scanned, PDFs.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Automatic Data Extraction</h3>
              <p className="text-muted-foreground">Our intelligent tool identifies tables in your PDF and extracts the data into rows and columns.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Download Your Excel File</h3>
              <p className="text-muted-foreground">Your data is now in an editable XLSX spreadsheet. Download it and start working with your numbers instantly.</p>
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
              <AccordionTrigger className="text-lg text-left">Will the formatting of my tables be preserved?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Our PDF to Excel converter does its best to maintain the original table structure, including rows and columns. However, complex formatting like merged cells or intricate styling may not be perfectly replicated. The primary goal is accurate data extraction.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Can this tool extract data from scanned PDFs?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                For the best results, use PDFs that were originally created digitally (native PDFs). While our OCR technology can attempt to extract data from scanned documents, the accuracy will be lower and may require manual cleanup.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Does the converter handle multiple pages with tables?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes. The tool will process all pages in your PDF. Each table found will typically be placed in a separate worksheet within the final Excel workbook for better organization.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
