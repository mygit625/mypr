"use server";

import { PDFDocument, degrees } from 'pdf-lib';
import type { Buffer } from 'buffer'; // Node.js Buffer

export interface PageData {
  id: string;
  originalIndex: number;
  rotation: number; // 0, 90, 180, 270
  isDeleted: boolean;
  width: number;
  height: number;
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
    return { error: "No PDF file provided." };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      console.error('Invalid data URI format for initial page data:', input.pdfDataUri.substring(0,100));
      return { error: `Invalid PDF data format. Please ensure the file is a valid PDF.` };
    }
    const pdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    
    const pages: PageData[] = pdfDoc.getPages().map((page, index) => ({
      id: index.toString(),
      originalIndex: index,
      rotation: page.getRotation().angle, // Gets current rotation, usually 0 initially
      isDeleted: false,
      width: page.getWidth(),
      height: page.getHeight(),
    }));

    return { pages };

  } catch (error: any) {
    console.error("Error getting initial page data:", error);
    return { error: error.message || "An unexpected error occurred while reading PDF pages." };
  }
}


export interface PageOperation {
  originalIndex: number;
  rotation: number; // 0, 90, 180, 270
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
  if (!input.operations) {
    return { error: "Page operations not provided." };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      console.error('Invalid data URI format for organize PDF:', input.pdfDataUri.substring(0,100));
      return { error: `Invalid PDF data format. Please ensure the file is a valid PDF.` };
    }
    const originalPdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const originalPdfDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
    
    const newPdfDoc = await PDFDocument.create();

    for (const op of input.operations) {
      if (op.originalIndex < 0 || op.originalIndex >= originalPdfDoc.getPageCount()) {
        console.warn(`Skipping invalid originalIndex: ${op.originalIndex}`);
        continue;
      }
      const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [op.originalIndex]);
      
      // Ensure rotation is one of the valid values.
      const validRotations = [0, 90, 180, 270];
      if (validRotations.includes(op.rotation)) {
        copiedPage.setRotation(degrees(op.rotation));
      } else {
        console.warn(`Invalid rotation value ${op.rotation} for page ${op.originalIndex}. Defaulting to 0.`);
        copiedPage.setRotation(degrees(0));
      }
      newPdfDoc.addPage(copiedPage);
    }
    
    if (newPdfDoc.getPageCount() === 0 && input.operations.length > 0) {
        return { error: "Organized PDF would be empty. No valid pages were processed." };
    }


    const organizedPdfBytes = await newPdfDoc.save();
    const organizedPdfDataUri = `data:application/pdf;base64,${Buffer.from(organizedPdfBytes).toString('base64')}`;

    return { organizedPdfDataUri };

  } catch (error: any) {
    console.error("Error organizing PDF:", error);
    return { error: error.message || "An unexpected error occurred while organizing the PDF." };
  }
}