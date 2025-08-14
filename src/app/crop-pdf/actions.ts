
'use server';

import { PDFDocument, type PDFPage } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface CropArea {
  x: number; // as percentage of width from left
  y: number; // as percentage of height from top
  width: number; // as percentage of width
  height: number; // as percentage of height
}

export interface CropPdfInput {
  pdfDataUri: string;
  cropArea: CropArea;
  applyTo: 'all' | 'current';
  currentPage: number; // 1-indexed
}

export interface CropPdfOutput {
  croppedPdfDataUri?: string;
  error?: string;
}

export async function cropPdfAction(input: CropPdfInput): Promise<CropPdfOutput> {
  if (!input.pdfDataUri) {
    return { error: 'No PDF data provided.' };
  }

  try {
    const pdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    
    const pagesToCrop = input.applyTo === 'all'
      ? pdfDoc.getPages()
      : [pdfDoc.getPage(input.currentPage - 1)];

    for (const page of pagesToCrop) {
      const { width, height } = page.getSize();
      
      const newX = width * input.cropArea.x;
      const newWidth = width * input.cropArea.width;
      const newHeight = height * input.cropArea.height;
      // pdf-lib's y-coordinate starts from the bottom of the page.
      // The client sends `y` as the top offset percentage.
      // Correct y = page_height - (top_offset + crop_height)
      const newY = height - (height * input.cropArea.y + newHeight);
      
      page.setCropBox(newX, newY, newWidth, newHeight);
    }
    
    const croppedPdfBytes = await pdfDoc.save();
    const croppedPdfDataUri = `data:application/pdf;base64,${Buffer.from(croppedPdfBytes).toString('base64')}`;

    return { croppedPdfDataUri };

  } catch (error: any) {
    console.error('Error cropping PDF:', error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
        return { error: 'The PDF is encrypted. Please provide a decrypted PDF.'}
    }
    return { error: error.message || 'An unexpected error occurred while cropping the PDF.' };
  }
}
