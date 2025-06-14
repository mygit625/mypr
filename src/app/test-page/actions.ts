
"use server";

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface AssemblePdfInput {
  orderedPdfDataUris: string[];
}

export interface AssemblePdfOutput {
  assembledPdfDataUri?: string;
  error?: string;
}

export async function assemblePdfAction(input: AssemblePdfInput): Promise<AssemblePdfOutput> {
  if (!input.orderedPdfDataUris || input.orderedPdfDataUris.length === 0) {
    // If only one PDF is provided, arguably it could just return that PDF.
    // However, for an "assemble" or "merge" like operation, usually more than one is implied.
    // To match merge, let's say at least one is needed, but the UI should enforce 2+ for the button to be active.
    // If the UI allows a single PDF, this action could just return it.
    // For now, let's keep it that it expects something to assemble.
     return { error: "At least one PDF file is required to assemble." };
  }
  
  if (input.orderedPdfDataUris.length === 1) {
    // If only one PDF is sent, just return it as is.
    return { assembledPdfDataUri: input.orderedPdfDataUris[0] };
  }

  try {
    const finalPdfDoc = await PDFDocument.create();

    for (const dataUri of input.orderedPdfDataUris) {
      if (!dataUri.startsWith('data:application/pdf;base64,')) {
        console.error('Invalid data URI format for a PDF segment:', dataUri.substring(0, 100));
        return { error: `Invalid PDF data format for one of the segments. Please ensure all files are valid PDFs.` };
      }
      const pdfBytes = Buffer.from(dataUri.split(',')[1], 'base64');
      const segmentPdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      
      if (segmentPdfDoc.getPageCount() === 0) {
        console.warn('A PDF segment with no pages was encountered and skipped.');
        continue; 
      }

      const copiedPages = await finalPdfDoc.copyPages(segmentPdfDoc, segmentPdfDoc.getPageIndices());
      copiedPages.forEach((page) => {
        finalPdfDoc.addPage(page);
      });
    }

    if (finalPdfDoc.getPageCount() === 0) {
        return { error: "The assembled PDF would be empty. No valid pages were found in the provided segments."}
    }

    const assembledPdfBytes = await finalPdfDoc.save();
    const assembledPdfDataUri = `data:application/pdf;base64,${Buffer.from(assembledPdfBytes).toString('base64')}`;
    
    return { assembledPdfDataUri };

  } catch (error: any)
