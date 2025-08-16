
"use client";

import { useEffect, useRef } from 'react';
import { FileSpreadsheet, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


export default function ExcelToPdfPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.getElementById('avepdf-embed-script')) {
       if (typeof (window as any).loadAvePDFWidget === 'function') {
        (window as any).loadAvePDFWidget('d9263667-adce-41ec-880e-26b4371a4fb0', 'auto', 'excel-to-pdf', 'avepdf-container-id');
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
        (window as any).loadAvePDFWidget('d9263667-adce-41ec-880e-26b4371a4fb0', 'auto', 'excel-to-pdf', 'avepdf-container-id');
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
        <h1 className="text-3xl font-bold tracking-tight">Excel to PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Convert your Excel spreadsheets to PDF documents seamlessly.
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
          <h2 className="text-3xl font-bold text-center mb-8">How to Convert Excel to PDF Free</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your Spreadsheet</h3>
              <p className="text-muted-foreground">Select your XLS or XLSX file by clicking the upload area or by dragging and dropping it.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Adjust and Convert</h3>
              <p className="text-muted-foreground">Our tool automatically formats your spreadsheet for PDF. The conversion process begins instantly.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Download Your PDF</h3>
              <p className="text-muted-foreground">Your Excel file is now a professionally formatted PDF, ready for you to download and share.</p>
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
              <AccordionTrigger className="text-lg text-left">Will all my Excel sheets be converted?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes, our tool will convert all the worksheets within your Excel workbook into separate pages in a single PDF document, maintaining their order.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">How will my spreadsheet be formatted in the PDF?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                The converter optimizes the layout for standard PDF pages. For very wide spreadsheets, it will automatically adjust the scaling to fit the content onto the page, similar to the "Fit to Page" option in Excel's print settings.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Is it possible to convert a specific range of cells?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Our online tool converts the entire content of your worksheets. To convert a specific range, we recommend first saving that range as a separate Excel file and then uploading the new file for conversion.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
