
"use client";

import { PenTool, FileUp, MousePointerClick, DownloadCloud, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function SignPdfPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-16 pb-16">
      <header className="text-center py-8">
        <PenTool className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Sign PDF</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          The PDF Signing tool is currently under construction, but we're working hard to bring it to you soon. Please check back later!
        </p>
      </header>

      <div className="max-w-4xl mx-auto space-y-16 pt-16">
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">How It Will Work</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center opacity-50">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your Document</h3>
              <p className="text-muted-foreground">Select the PDF file you need to sign or send for signature. The document will be loaded into our secure viewer.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <MousePointerClick className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Create & Place Signature</h3>
              <p className="text-muted-foreground">Draw, type, or upload an image of your signature. Place it anywhere on the document. You can also add fields for others to sign.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Sign & Download</h3>
              <p className="text-muted-foreground">Finalize the document by applying your signature. Download the legally binding, signed PDF instantly.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="text-center mb-12">
            <HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-3xl font-bold">Anticipated Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg text-left">Will the signatures be legally binding?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Yes, our e-signature tool will comply with major e-signature laws like the ESIGN Act and eIDAS. The signed documents will include an audit trail to ensure they are legally admissible and secure.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg text-left">Can I request signatures from other people?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                Absolutely. The tool will allow you to add signature fields for other recipients. You will be able to enter their email addresses and send them a secure link to sign the document directly.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg text-left">What signature creation options will be available?</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                You will have multiple ways to create your signature: you can draw it using your mouse or touchscreen, type it and choose from a selection of handwritten fonts, or upload an image of your signature.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section>
          <div className="prose dark:prose-invert lg:prose-lg max-w-full">
            <h2 className="text-3xl font-bold text-center">The Future of Document Signing is Digital</h2>
            <p>In our increasingly remote and digital world, the need for a fast, secure, and reliable way to sign documents is more important than ever. Our upcoming PDF signing tool will eliminate the cumbersome process of printing, signing, and scanning. We are building a solution that is not only convenient but also legally sound and secure.</p>
            <h3>Key Features to Expect</h3>
            <ul>
              <li><strong>Easy Signature Creation:</strong> Create a digital version of your signature in seconds.</li>
              <li><strong>Simple Placement:</strong> Drag and drop your signature, date, and text fields anywhere on your PDF.</li>
              <li><strong>Multi-party Signing:</strong> Easily send documents to multiple people and track the signing process.</li>
              <li><strong>Secure and Verifiable:</strong> Every signed document will come with a comprehensive audit trail to ensure its integrity and legal validity.</li>
            </ul>
            <p>Our goal is to provide you with a seamless e-signature experience that saves you time and paper. Whether you're signing a contract, an invoice, or an agreement, our tool will make the process effortless. Stay tuned for updates!</p>
          </div>
        </section>
      </div>
    </div>
  );
}
