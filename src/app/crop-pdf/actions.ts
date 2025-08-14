
'use server';

import { PDFDocument, type PDFPage } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface CropArea {
  x: number; // as percentage of width from left (0-1)
  y: number; // as percentage of height from top (0-1)
  width: number; // as percentage of width (0-1)
  height: number; // as percentage of height (0-1)
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
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      const newWidth = pageWidth * input.cropArea.width;
      const newHeight = pageHeight * input.cropArea.height;
      const newX = pageWidth * input.cropArea.x;
      
      // Correct calculation for pdf-lib's y-coordinate system (origin is bottom-left).
      // The client sends `y` as the top offset percentage.
      // The correct y for pdf-lib is: page_height - (top_offset_in_points + crop_box_height_in_points)
      const newY = pageHeight - (pageHeight * input.cropArea.y + newHeight);
      
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
