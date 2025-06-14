
"use server";

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

// Interface for specifying a page to be included in the assembly
interface PageToAssembleInfo {
  sourcePdfDataUri: string; // Data URI of the source PDF from which the page is taken
  pageIndexToCopy: number;  // 0-based index of the page to copy from this source PDF
}

// Input for the organizePagesAction, listing pages in their desired final order
export interface OrganizePagesInput {
  orderedPagesToAssemble: PageToAssembleInfo[];
}

// Output for the organizePagesAction
export interface OrganizePagesOutput {
  organizedPdfDataUri?: string; // Data URI of the newly assembled PDF
  error?: string;
}

// Action to assemble individual pages from potentially multiple source PDFs into a single new PDF
export async function organizePagesAction(input: OrganizePagesInput): Promise<OrganizePagesOutput> {
  if (!input.orderedPagesToAssemble || input.orderedPagesToAssemble.length === 0) {
     return { error: "No pages provided to organize and assemble." };
  }
  
  const finalPdfDoc = await PDFDocument.create();

  try {
    for (const pageInfo of input.orderedPagesToAssemble) {
      if (!pageInfo.sourcePdfDataUri.startsWith('data:application/pdf;base64,')) {
        console.error('Invalid data URI format for a source PDF in organization:', pageInfo.sourcePdfDataUri.substring(0, 100));
        return { error: `Invalid PDF data format for one of the source documents. Please ensure all files are valid PDFs.` };
      }
      const pdfBytes = Buffer.from(pageInfo.sourcePdfDataUri.split(',')[1], 'base64');
      const sourcePdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      
      if (pageInfo.pageIndexToCopy < 0 || pageInfo.pageIndexToCopy >= sourcePdfDoc.getPageCount()) {
        console.warn(`Invalid page index ${pageInfo.pageIndexToCopy} for a source PDF with ${sourcePdfDoc.getPageCount()} pages during organization. Skipping this page.`);
        continue; 
      }
      
      if (sourcePdfDoc.getPageCount() === 0) {
        console.warn('A source PDF with no pages was encountered and skipped during organization.');
        continue; 
      }

      const [copiedPage] = await finalPdfDoc.copyPages(sourcePdfDoc, [pageInfo.pageIndexToCopy]);
      finalPdfDoc.addPage(copiedPage);
    }

    if (finalPdfDoc.getPageCount() === 0) {
        return { error: "The organized PDF would be empty. No valid pages were found or selected."}
    }

    const organizedPdfBytes = await finalPdfDoc.save();
    const organizedPdfDataUri = `data:application/pdf;base64,${Buffer.from(organizedPdfBytes).toString('base64')}`;
    
    return { organizedPdfDataUri };

  } catch (error: any) {
    console.error("Error organizing PDF pages:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted') && !error.message.toLowerCase().includes('ignoreencryption')) {
        return { error: "One of the source PDFs is encrypted with restrictions that prevent modification. Please provide decrypted PDFs."}
    }
    return { error: error.message || "An unexpected error occurred while organizing the PDF pages." };
  }
}
