
"use server";

// Polyfill for Promise.withResolvers - Kept for broader compatibility if other server-side code might need it,
// though pdfjs-dist is being removed from this specific file.
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import { PDFDocument, degrees } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface PageData {
  id: string;
  originalIndex: number;
  rotation: number;
  width: number;
  height: number;
  isDeleted?: boolean;
}

export interface GetInitialPageDataInput {
  pdfDataUri: string;
}

export interface GetInitialPageDataOutput {
  pages?: PageData[];
  error?: string;
}

export async function getInitialPageDataAction(input: GetInitialPageDataInput): Promise<GetInitialPageDataOutput> {
  if (!input.pdfDataUri) {
    return { error: "No PDF data provided." };
  }
  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: `Invalid PDF data format.` };
    }
    const pdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');

    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    const pagesData: PageData[] = [];
    const pageCount = pdfDoc.getPageCount();

    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const { width: intrinsicWidth, height: intrinsicHeight } = page.getSize();
      const rotationAngle = page.getRotation().angle;

      let actualWidth = intrinsicWidth;
      let actualHeight = intrinsicHeight;

      // Adjust width and height based on rotation to reflect display dimensions
      if (rotationAngle === 90 || rotationAngle === 270) {
        actualWidth = intrinsicHeight; // When rotated, width becomes height
        actualHeight = intrinsicWidth;  // and height becomes width
      }

      pagesData.push({
        id: crypto.randomUUID(),
        originalIndex: i,
        rotation: rotationAngle,
        width: actualWidth,
        height: actualHeight,
        isDeleted: false,
      });
    }
    return { pages: pagesData };
  } catch (error: any) {
    console.error("Error in getInitialPageDataAction (using pdf-lib):", error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
        return { error: "The PDF is encrypted. Please provide a decrypted PDF to extract page data." };
    }
    return { error: error.message || "Failed to load page data from PDF." };
  }
}

export interface PageOperation {
  originalIndex: number;
  rotation: number;
}

export interface OrganizePdfInput {
  pdfDataUri: string;
  operations: PageOperation[];
}

export interface OrganizePdfOutput {
  organizedPdfDataUri?: string;
  error?: string;
}

export async function organizePdfAction(input: OrganizePdfInput): Promise<OrganizePdfOutput> {
  if (!input.pdfDataUri) {
    return { error: "Original PDF data not provided." };
  }
  if (!input.operations || input.operations.length === 0) {
    return { error: "No page operations provided." };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: `Invalid PDF data format.` };
    }
    const originalPdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const originalPdfDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });

    const newPdfDoc = await PDFDocument.create();

    for (const op of input.operations) {
      if (op.originalIndex < 0 || op.originalIndex >= originalPdfDoc.getPageCount()) {
        console.warn(`Invalid original page index ${op.originalIndex} during organization. Skipping.`);
        continue;
      }
      const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [op.originalIndex]);
      copiedPage.setRotation(degrees(op.rotation));
      newPdfDoc.addPage(copiedPage);
    }

    if (newPdfDoc.getPageCount() === 0) {
        return { error: "Resulting PDF would be empty. No valid pages were processed." };
    }

    const organizedPdfBytes = await newPdfDoc.save();
    const organizedPdfDataUri = `data:application/pdf;base64,${Buffer.from(organizedPdfBytes).toString('base64')}`;

    return { organizedPdfDataUri };

  } catch (error: any) {
    console.error("Error in organizePdfAction (single PDF processing):", error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
        return { error: "The PDF is encrypted with restrictions that prevent modification."}
    }
    return { error: error.message || "An unexpected error occurred while processing the PDF." };
  }
}
// --- END: Existing code for Rotate/Remove Pages ---


// --- START: New code for page-level assembly (like add-pages, for the "Organize PDF" page) ---
interface PageToAssembleInfo {
  sourcePdfDataUri: string;
  pageIndexToCopy: number;  // 0-based
  rotation: number; // Added rotation
}

export interface AssembleIndividualPagesForOrganizeInput {
  orderedPagesToAssemble: PageToAssembleInfo[];
}

export interface AssembleIndividualPagesForOrganizeOutput {
  organizedPdfDataUri?: string;
  error?: string;
}

export async function assembleIndividualPagesAction(input: AssembleIndividualPagesForOrganizeInput): Promise<AssembleIndividualPagesForOrganizeOutput> {
  if (!input.orderedPagesToAssemble || input.orderedPagesToAssemble.length === 0) {
     return { error: "No pages provided to organize and assemble." };
  }

  const finalPdfDoc = await PDFDocument.create();

  try {
    for (const pageInfo of input.orderedPagesToAssemble) {
      if (!pageInfo.sourcePdfDataUri.startsWith('data:application/pdf;base64,')) {
        console.error('Invalid data URI format for a source PDF in organization (assembleIndividualPagesAction):', pageInfo.sourcePdfDataUri.substring(0, 100));
        return { error: `Invalid PDF data format for one of the source documents. Please ensure all files are valid PDFs.` };
      }
      const pdfBytes = Buffer.from(pageInfo.sourcePdfDataUri.split(',')[1], 'base64');
      const sourcePdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      if (pageInfo.pageIndexToCopy < 0 || pageInfo.pageIndexToCopy >= sourcePdfDoc.getPageCount()) {
        console.warn(`Invalid page index ${pageInfo.pageIndexToCopy} for a source PDF with ${sourcePdfDoc.getPageCount()} during organization (assembleIndividualPagesAction). Skipping this page.`);
        continue;
      }

      if (sourcePdfDoc.getPageCount() === 0) {
        console.warn('A source PDF with no pages was encountered and skipped during organization (assembleIndividualPagesAction).');
        continue;
      }

      const [copiedPage] = await finalPdfDoc.copyPages(sourcePdfDoc, [pageInfo.pageIndexToCopy]);
      copiedPage.setRotation(degrees(pageInfo.rotation)); // Apply rotation
      finalPdfDoc.addPage(copiedPage);
    }

    if (finalPdfDoc.getPageCount() === 0) {
        return { error: "The organized PDF (assembled from individual pages) would be empty. No valid pages were found or selected."}
    }

    const organizedPdfBytes = await finalPdfDoc.save();
    const organizedPdfDataUri = `data:application/pdf;base64,${Buffer.from(organizedPdfBytes).toString('base64')}`;

    return { organizedPdfDataUri };

  } catch (error: any) {
    console.error("Error in assembleIndividualPagesAction for Organize PDF:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted') && !error.message.toLowerCase().includes('ignoreencryption')) {
        return { error: "One of the source PDFs is encrypted with restrictions that prevent modification. Please provide decrypted PDFs."}
    }
    return { error: error.message || "An unexpected error occurred while assembling the PDF pages for organization." };
  }
}
// --- END: New code for page-level assembly ---
