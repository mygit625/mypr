
"use server";

// Polyfill for Promise.withResolvers
// This is required by pdfjs-dist v4.0.379+ if the environment (e.g., Node.js < 22) doesn't support it.
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

import { PDFDocument, degrees } from 'pdf-lib'; // Import degrees
import type { Buffer } from 'buffer';

// --- START: Existing code for Rotate/Remove Pages ---
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'; 
import type { PDFDocumentProxy as PDFJSInternalDocumentProxy } from 'pdfjs-dist/types/src/display/api';

// Note: This workerSrc setup below only runs if 'window' is defined, so it won't apply during server-side execution of getInitialPageDataAction.
// pdfjs-dist might behave differently or attempt different initialization paths on the server.
if (typeof window !== 'undefined') { 
    if (pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }
}


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

    const arrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
    // Modified to disable worker for server-side execution
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true });
    const pdfDoc: PDFJSInternalDocumentProxy = await loadingTask.promise;

    const pagesData: PageData[] = [];
    for (let i = 0; i < pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i + 1);
      const viewport = page.getViewport({ scale: 1, rotation: page.rotate }); 
      pagesData.push({
        id: crypto.randomUUID(),
        originalIndex: i,
        rotation: page.rotate || 0, 
        width: viewport.width,
        height: viewport.height,
        isDeleted: false,
      });
    }
    if (typeof (pdfDoc as any).destroy === 'function') {
        await (pdfDoc as any).destroy();
    }
    return { pages: pagesData };
  } catch (error: any) {
    console.error("Error in getInitialPageDataAction:", error);
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

    