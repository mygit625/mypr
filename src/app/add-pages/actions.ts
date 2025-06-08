
"use server";

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

export type { GetInitialPageDataInput, GetInitialPageDataOutput, PageData } from '../organize/actions';
import { getInitialPageDataAction as originalGetInitialPageDataAction } from '../organize/actions';

export async function getInitialPageDataAction(input: GetInitialPageDataInput): Promise<GetInitialPageDataOutput> {
  return originalGetInitialPageDataAction(input);
}

export interface AddPagesToPdfInput {
  targetPdfDataUri: string;
  sourcePdfDataUris: string[];
  insertionPageNumber?: number; // 1-indexed page number *before* which to insert
}

export interface AddPagesToPdfOutput {
  modifiedPdfDataUri?: string;
  error?: string;
}

export async function addPagesToPdfAction(input: AddPagesToPdfInput): Promise<AddPagesToPdfOutput> {
  if (!input.targetPdfDataUri) {
    return { error: "Target PDF not provided." };
  }
  if (!input.sourcePdfDataUris || input.sourcePdfDataUris.length === 0) {
    return { error: "No source PDF(s) provided to add pages from." };
  }

  try {
    // Validate target PDF
    if (!input.targetPdfDataUri.startsWith('data:application/pdf;base64,')) {
      console.error('Invalid data URI format for target PDF in addPages:', input.targetPdfDataUri.substring(0,100));
      return { error: `Invalid Target PDF data format.` };
    }
    const targetPdfBytes = Buffer.from(input.targetPdfDataUri.split(',')[1], 'base64');
    const targetPdfDoc = await PDFDocument.load(targetPdfBytes, { ignoreEncryption: true });

    let insertionIndex = input.insertionPageNumber ? input.insertionPageNumber - 1 : targetPdfDoc.getPageCount();
    // Clamp insertionIndex to be within valid bounds (0 to targetPdfDoc.getPageCount())
    insertionIndex = Math.max(0, Math.min(insertionIndex, targetPdfDoc.getPageCount()));

    // Collect all pages from all source documents
    const allSourcePagesToCopy: { doc: PDFDocumentProxy, indices: number[] }[] = [];

    for (const sourceUri of input.sourcePdfDataUris) {
      if (!sourceUri.startsWith('data:application/pdf;base64,')) {
         console.warn('Invalid data URI format for a source PDF in addPages:', sourceUri.substring(0,100));
         // Optionally skip this source or return an error
         return { error: `Invalid Source PDF data format for one of the files.`};
      }
      const sourcePdfBytes = Buffer.from(sourceUri.split(',')[1], 'base64');
      const sourcePdfDoc = await PDFDocument.load(sourcePdfBytes, { ignoreEncryption: true });
      if (sourcePdfDoc.getPageCount() > 0) {
        allSourcePagesToCopy.push({ doc: sourcePdfDoc, indices: sourcePdfDoc.getPageIndices() });
      }
    }
    
    if (allSourcePagesToCopy.length === 0) {
        return { error: "No pages found in the source PDF(s) to add." };
    }

    // Iterate through source documents and their pages to copy into the target
    // Copying pages in reverse order of source documents and then inserting them at the same index
    // effectively maintains the order of source documents and their internal page order.
    for (let i = allSourcePagesToCopy.length - 1; i >= 0; i--) {
        const source = allSourcePagesToCopy[i];
        const copiedPages = await targetPdfDoc.copyPages(source.doc, source.indices);
        // Insert pages in their original order from the source doc
        for (let j = 0; j < copiedPages.length; j++) {
            targetPdfDoc.insertPage(insertionIndex + j, copiedPages[j]);
        }
    }
    
    const modifiedPdfBytes = await targetPdfDoc.save();
    const modifiedPdfDataUri = `data:application/pdf;base64,${Buffer.from(modifiedPdfBytes).toString('base64')}`;

    return { modifiedPdfDataUri };

  } catch (error: any) {
    console.error("Error adding pages to PDF:", error);
    return { error: error.message || "An unexpected error occurred while adding pages." };
  }
}

// Minimal type for PDFDocumentProxy for the action. Real one is complex.
interface PDFDocumentProxy {
  getPageCount(): number;
  getPageIndices(): number[];
  // other methods not needed for this simplified type
}
