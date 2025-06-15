
"use server";

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Buffer } from 'buffer';

// Re-export types and action for fetching initial page data for previews
export type { GetInitialPageDataInput, GetInitialPageDataOutput, PageData } from '../organize/actions';
import { getInitialPageDataAction as originalGetInitialPageDataAction } from '../organize/actions';

export async function getInitialPageDataAction(input: GetInitialPageDataInput): Promise<GetInitialPageDataOutput> {
  return originalGetInitialPageDataAction(input);
}

export interface AddTextToPdfInput {
  pdfDataUri: string;
  text: string;
  pageNumber: number; // 1-indexed
  x: number;
  y: number;
  fontSize: number;
  // color (r,g,b) could be added here, e.g., color: { r: number; g: number; b: number }
}

export interface AddTextToPdfOutput {
  processedPdfDataUri?: string;
  error?: string;
}

export async function addTextToPdfAction(input: AddTextToPdfInput): Promise<AddTextToPdfOutput> {
  if (!input.pdfDataUri) {
    return { error: "Original PDF data not provided." };
  }
  if (!input.text) {
    return { error: "No text provided to add." };
  }
  if (input.pageNumber < 1) {
    return { error: "Invalid page number. Page number must be 1 or greater." };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: `Invalid PDF data format.` };
    }
    const originalPdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const pdfDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });

    if (input.pageNumber > pdfDoc.getPageCount()) {
      return { error: `Page number ${input.pageNumber} exceeds the total number of pages (${pdfDoc.getPageCount()}).` };
    }

    const page = pdfDoc.getPage(input.pageNumber - 1); // 0-indexed
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Default color is black. Can be made configurable.
    // const textColor = input.color ? rgb(input.color.r, input.color.g, input.color.b) : rgb(0, 0, 0);

    page.drawText(input.text, {
      x: input.x,
      y: input.y, // Y is from the bottom-left corner in pdf-lib
      size: input.fontSize,
      font: helveticaFont,
      color: rgb(0, 0, 0), // Black color
    });

    const processedPdfBytes = await pdfDoc.save();
    const processedPdfDataUri = `data:application/pdf;base64,${Buffer.from(processedPdfBytes).toString('base64')}`;

    return { processedPdfDataUri };

  } catch (error: any) {
    console.error("Error adding text to PDF:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
        return { error: "The PDF is encrypted with restrictions that prevent modification."}
    }
    return { error: error.message || "An unexpected error occurred while adding text to the PDF." };
  }
}
