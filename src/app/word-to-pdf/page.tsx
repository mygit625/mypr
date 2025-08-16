
"use client";

import { useEffect, useRef } from 'react';
import { FileCode, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function WordToPdfPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the script has already been added to avoid duplicates
    if (document.getElementById('avepdf-embed-script')) {
      // If script exists, but widget isn't loaded, try to load widget again.
      // This handles navigation back and forth.
       if (typeof (window as any).loadAvePDFWidget === 'function') {
        (window as any).loadAvePDFWidget('f6b881be-add7-47ad-b1bf-79caa7cf4730', 'auto', 'word-to-pdf', 'avepdf-container-id');
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
        (window as any).loadAvePDFWidget('f6b881be-add7-47ad-b1bf-79caa7cf4730', 'auto', 'word-to-pdf', 'avepdf-container-id');
      }
    };
    
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
      /* Use a CSS variable that will be defined for light and dark themes */
      background-color: var(--background-hsl);
      height: 93px;
      border-style: none;
      margin-top: -60px;
      position: relative;
      z-index: 1;
    }

    /* Define the variable for light mode */
    body:not(.dark) hr.watermark-cover {
      --background-hsl: #FFFFFF;
    }

    /* Define the variable for dark mode */
    body.dark hr.watermark-cover {
      --background-hsl: hsl(240 10% 3.9%);
    }
  `;

  return (
    <div className="max-w-full mx-auto space-y-8">
      <style dangerouslySetInnerHTML={{ __html: customCss }} />
      <header className="text-center py-8">
        <FileCode className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Word to PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Convert your DOCX files to PDF.
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
          <h2 className="text-3xl font-bold text-center mb-8">How to Convert Word to PDF Online</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your Word File</h3>
              <p className="text-muted-foreground">Click the upload area to select your DOC or DOCX file, or simply drag and drop it. Your file is processed securely.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Automatic Conversion</h3>
              <p className="text-muted-foreground">Our tool will automatically start the conversion process as soon as the file is uploaded, preserving your original formatting.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Download Your PDF</h3>
              <p className="text-muted-foreground">Once converted, your new PDF file will be ready for instant download. No watermarks, no sign-ups required.</p>
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
              <AccordionTrigger className="text-lg text-left">Will my formatting be preserved when converting from Word to PDF?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes, our converter is designed to maintain the original formatting, including fonts, images, and layout, as closely as possible. The resulting PDF will look just like your Word document.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Can I convert both DOC and DOCX files?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Absolutely. Our tool supports both the older DOC format and the modern DOCX format for seamless conversion to PDF.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">Is this online Word to PDF converter free?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes, our tool is 100% free to use. There are no limits on the number of files you can convert.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">The Advantage of Converting Word to PDF</h2>
            <p>Microsoft Word is excellent for creating and editing documents, but when it's time to share, the PDF format offers unparalleled advantages. Converting your DOC or DOCX file to PDF ensures that your document's layout and formatting are universally preserved, regardless of the device or operating system used to view it.</p>
            <h3>Key Benefits of Word to PDF Conversion</h3>
            <ul>
              <li><strong>Universal Compatibility:</strong> PDFs can be opened on virtually any device while maintaining the original look and feel. This eliminates issues with font substitutions or layout shifts that can occur with Word files.</li>
              <li><strong>Professionalism:</strong> Sending a PDF is often considered more professional than sending an editable Word document, as it presents a final, read-only version.</li>
              <li><strong>Enhanced Security:</strong> PDFs can be protected with passwords and restrictions, preventing unauthorized copying, printing, or editing.</li>
            </ul>
            <p>Our free online Word to PDF converter provides a fast and reliable way to make your documents share-ready. Whether you're submitting a resume, sending a business report, or sharing an academic paper, converting to PDF is the final step to ensure your work is presented exactly as you intended.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
