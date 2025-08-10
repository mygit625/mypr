'use server';

import { PDFDocument, degrees } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface RotateAllPagesInput {
  pdfDataUri: string;
  rotation: number; // 90, 180, 270
}

export interface RotateAllPagesOutput {
  processedPdfDataUri?: string;
  error?: string;
}

export async function rotateAllPagesAction(
  input: RotateAllPagesInput
): Promise<RotateAllPagesOutput> {
  if (!input.pdfDataUri) {
    return { error: 'No PDF data provided.' };
  }
  if (![90, 180, 270, -90, -180, -270].includes(input.rotation)) {
    return { error: 'Invalid rotation angle. Must be 90, 180, or 270.' };
  }

  try {
    const pdfBytes = Buffer.from(
      input.pdfDataUri.split(';base64,').pop()!,
      'base64'
    );
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    const pages = pdfDoc.getPages();
    pages.forEach((page) => {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + input.rotation));
    });

    const processedPdfBytes = await pdfDoc.save();
    const processedPdfDataUri = `data:application/pdf;base64,${Buffer.from(
      processedPdfBytes
    ).toString('base64')}`;

    return { processedPdfDataUri };
  } catch (error: any) {
    console.error('Error rotating PDF pages:', error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
      return { error: 'The PDF is encrypted and cannot be rotated.' };
    }
    return {
      error:
        error.message || 'An unexpected error occurred while rotating the PDF.',
    };
  }
}
