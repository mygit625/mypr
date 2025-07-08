
"use server";

import { PDFDocument, degrees } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface RotateAllPagesInput {
  pdfDataUri: string;
  rotation: number; // 0, 90, 180, 270
}

export interface RotateAllPagesOutput {
  processedPdfDataUri?: string;
  error?: string;
}

export async function rotateAllPagesAction(input: RotateAllPagesInput): Promise<RotateAllPagesOutput> {
  if (!input.pdfDataUri) {
    return { error: "No PDF data provided." };
  }
  if (![0, 90, 180, 270].includes(input.rotation)) {
    return { error: "Invalid rotation value. Must be 0, 90, 180, or 270." };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: `Invalid PDF data format.` };
    }
    const pdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    if (pdfDoc.getPageCount() === 0) {
      return { error: "The PDF has no pages to rotate." };
    }

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      // Get current rotation and add the new rotation
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + input.rotation)); // pdf-lib handles normalization to 0-359
    }

    const processedPdfBytes = await pdfDoc.save();
    const processedPdfDataUri = `data:application/pdf;base64,${Buffer.from(processedPdfBytes).toString('base64')}`;

    return { processedPdfDataUri };

  } catch (error: any) {
    console.error("Error in rotateAllPagesAction:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
        return { error: "The PDF is encrypted with restrictions that prevent modification."}
    }
    return { error: error.message || "An unexpected error occurred while rotating the PDF." };
  }
}
