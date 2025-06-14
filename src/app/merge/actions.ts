
"use server";

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface MergePdfsInput {
  orderedPdfDataUris: string[];
}

export interface MergePdfsOutput {
  mergedPdfDataUri?: string;
  error?: string;
}

export async function mergePdfsAction(input: MergePdfsInput): Promise<MergePdfsOutput> {
  if (!input.orderedPdfDataUris || input.orderedPdfDataUris.length === 0) {
    // For merge, typically at least two are expected, but the UI might allow one to "prepare"
    // For consistency with add-pages, let's allow one, which will just return itself.
    // The UI should enforce 2+ for the button to be active for actual merging.
     return { error: "At least one PDF file is required to merge." };
  }
  
  if (input.orderedPdfDataUris.length === 1) {
    // If only one PDF is sent, just return it as is.
    return { mergedPdfDataUri: input.orderedPdfDataUris[0] };
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
        console.warn('A PDF segment with no pages was encountered and skipped during merge.');
        continue; 
      }

      const copiedPages = await finalPdfDoc.copyPages(segmentPdfDoc, segmentPdfDoc.getPageIndices());
      copiedPages.forEach((page) => {
        finalPdfDoc.addPage(page);
      });
    }

    if (finalPdfDoc.getPageCount() === 0) {
        return { error: "The merged PDF would be empty. No valid pages were found in the provided segments."}
    }

    const mergedPdfBytes = await finalPdfDoc.save();
    const mergedPdfDataUri = `data:application/pdf;base64,${Buffer.from(mergedPdfBytes).toString('base64')}`;
    
    return { mergedPdfDataUri };

  } catch (error: any) {
    console.error("Error merging PDF segments:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted') && !error.message.toLowerCase().includes('ignoreencryption')) {
        return { error: "One of the PDF segments is encrypted with restrictions that prevent modification. Please provide decrypted PDFs."}
    }
    return { error: error.message || "An unexpected error occurred while merging the PDF." };
  }
}

