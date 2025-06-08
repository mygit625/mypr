
"use server";

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

// Re-export types and wrapped action from organize/actions
export type { GetInitialPageDataInput, GetInitialPageDataOutput, PageData } from '../organize/actions';
import { getInitialPageDataAction as originalGetInitialPageDataAction } from '../organize/actions';

export async function getInitialPageDataAction(input: GetInitialPageDataInput): Promise<GetInitialPageDataOutput> {
  return originalGetInitialPageDataAction(input);
}

export interface AssemblePdfInput {
  orderedPdfDataUris: string[];
}

export interface AssemblePdfOutput {
  assembledPdfDataUri?: string;
  error?: string;
}

export async function assemblePdfAction(input: AssemblePdfInput): Promise<AssemblePdfOutput> {
  if (!input.orderedPdfDataUris || input.orderedPdfDataUris.length === 0) {
    return { error: "No PDF segments provided to assemble." };
  }

  try {
    const finalPdfDoc = await PDFDocument.create();

    for (const dataUri of input.orderedPdfDataUris) {
      if (!dataUri.startsWith('data:application/pdf;base64,')) {
        console.error('Invalid data URI format for a PDF segment:', dataUri.substring(0, 100));
        return { error: `Invalid PDF data format for one of the segments. Please ensure all files are valid PDFs.` };
      }
      const pdfBytes = Buffer.from(dataUri.split(',')[1], 'base64');
      // Set ignoreEncryption to true to attempt processing, but some encrypted files might still fail.
      const segmentPdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      
      if (segmentPdfDoc.getPageCount() === 0) {
        console.warn('A PDF segment with no pages was encountered and skipped.');
        continue; // Skip empty PDFs
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

  } catch (error: any) {
    console.error("Error assembling PDF segments:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted') && !error.message.toLowerCase().includes('ignoreencryption')) {
        return { error: "One of the PDF segments is encrypted with restrictions that prevent modification. Please provide decrypted PDFs."}
    }
    return { error: error.message || "An unexpected error occurred while assembling the PDF." };
  }
}
