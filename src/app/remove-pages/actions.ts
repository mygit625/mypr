
"use server";

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer'; // Node.js Buffer

// Types for initial page data loading (re-used from organize/actions)
// These are correctly re-exported for use by the page component.
export type { GetInitialPageDataInput, GetInitialPageDataOutput, PageData } from '../organize/actions';

// Import the original action that we want to wrap and re-export
import { getInitialPageDataAction as originalGetInitialPageDataAction } from '../organize/actions';

// The wrapper function that will be exported.
// It uses the GetInitialPageDataInput and GetInitialPageDataOutput types
// that are effectively in scope due to the `export type` above.
export async function getInitialPageDataAction(input: GetInitialPageDataInput): Promise<GetInitialPageDataOutput> {
  return originalGetInitialPageDataAction(input);
}


export interface RemovePagesInput {
  pdfDataUri: string;
  pagesToKeepIndices: number[]; // 0-indexed list of pages to KEEP
}

export interface RemovePagesOutput {
  processedPdfDataUri?: string;
  error?: string;
}

export async function removeSelectedPagesAction(input: RemovePagesInput): Promise<RemovePagesOutput> {
  if (!input.pdfDataUri) {
    return { error: "Original PDF data not provided." };
  }
  if (!input.pagesToKeepIndices) {
    // If null/undefined, it implies keep all, but for "remove pages", this action should receive specific pages to keep or none (if all are deleted)
    return { error: "Information about pages to keep not provided." };
  }
  if (input.pagesToKeepIndices.length === 0) {
    return { error: "No pages selected to keep. The resulting PDF would be empty." };
  }


  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      console.error('Invalid data URI format for remove pages:', input.pdfDataUri.substring(0,100));
      return { error: `Invalid PDF data format. Please ensure the file is a valid PDF.` };
    }
    const originalPdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const originalPdfDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
    
    const newPdfDoc = await PDFDocument.create();

    // Sort indices to ensure pages are added in the correct order
    const sortedPagesToKeepIndices = [...input.pagesToKeepIndices].sort((a, b) => a - b);

    for (const pageIndex of sortedPagesToKeepIndices) {
      if (pageIndex < 0 || pageIndex >= originalPdfDoc.getPageCount()) {
        console.warn(`Skipping invalid page index for removal operation: ${pageIndex}`);
        continue; // Skip invalid indices
      }
      const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [pageIndex]);
      newPdfDoc.addPage(copiedPage);
    }
    
    // Check if any pages were actually added. This check is somewhat redundant due to the input.pagesToKeepIndices.length === 0 check above,
    // but good for safety if indices were invalid.
    if (newPdfDoc.getPageCount() === 0) {
        return { error: "Resulting PDF would be empty. No valid pages were kept." };
    }

    const processedPdfBytes = await newPdfDoc.save();
    const processedPdfDataUri = `data:application/pdf;base64,${Buffer.from(processedPdfBytes).toString('base64')}`;

    return { processedPdfDataUri };

  } catch (error: any) {
    console.error("Error removing PDF pages:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted') && !error.message.toLowerCase().includes('ignoreencryption')) {
        return { error: "The PDF is encrypted with restrictions that prevent modification. Please provide decrypted PDFs."}
    }
    return { error: error.message || "An unexpected error occurred while processing the PDF." };
  }
}
