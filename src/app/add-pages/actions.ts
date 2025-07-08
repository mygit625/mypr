
"use server";

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

interface PageToAssembleInfo {
  sourcePdfDataUri: string; // Data URI of the source PDF
  pageIndexToCopy: number;  // 0-based index of the page to copy from this source PDF
}

export interface AssembleIndividualPagesInput {
  orderedPagesToAssemble: PageToAssembleInfo[];
}

export interface AssembleIndividualPagesOutput {
  assembledPdfDataUri?: string;
  error?: string;
}

export async function assemblePdfAction(input: AssembleIndividualPagesInput): Promise<AssembleIndividualPagesOutput> {
  if (!input.orderedPagesToAssemble || input.orderedPagesToAssemble.length === 0) {
     return { error: "No pages provided to assemble." };
  }
  
  const finalPdfDoc = await PDFDocument.create();

  try {
    for (const pageInfo of input.orderedPagesToAssemble) {
      if (!pageInfo.sourcePdfDataUri.startsWith('data:application/pdf;base64,')) {
        console.error('Invalid data URI format for a source PDF:', pageInfo.sourcePdfDataUri.substring(0, 100));
        return { error: `Invalid PDF data format for one of the source documents. Please ensure all files are valid PDFs.` };
      }
      const pdfBytes = Buffer.from(pageInfo.sourcePdfDataUri.split(',')[1], 'base64');
      const sourcePdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      
      if (pageInfo.pageIndexToCopy < 0 || pageInfo.pageIndexToCopy >= sourcePdfDoc.getPageCount()) {
        console.warn(`Invalid page index ${pageInfo.pageIndexToCopy} for a source PDF with ${sourcePdfDoc.getPageCount()} pages. Skipping this page.`);
        continue; 
      }
      
      if (sourcePdfDoc.getPageCount() === 0) {
        console.warn('A source PDF with no pages was encountered and skipped.');
        continue; 
      }

      const [copiedPage] = await finalPdfDoc.copyPages(sourcePdfDoc, [pageInfo.pageIndexToCopy]);
      finalPdfDoc.addPage(copiedPage);
    }

    if (finalPdfDoc.getPageCount() === 0) {
        return { error: "The assembled PDF would be empty. No valid pages were found or selected."}
    }

    const assembledPdfBytes = await finalPdfDoc.save();
    const assembledPdfDataUri = `data:application/pdf;base64,${Buffer.from(assembledPdfBytes).toString('base64')}`;
    
    return { assembledPdfDataUri };

  } catch (error: any) {
    console.error("Error assembling individual PDF pages for Add Pages:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted') && !error.message.toLowerCase().includes('ignoreencryption')) {
        return { error: "One of the source PDFs is encrypted with restrictions that prevent modification. Please provide decrypted PDFs."}
    }
    return { error: error.message || "An unexpected error occurred while assembling the PDF pages." };
  }
}

    