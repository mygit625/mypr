'use server';

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface CreatePdfFromImagesInput {
  imageDataUris: string[];
}

export interface CreatePdfFromImagesOutput {
  pdfDataUri?: string;
  error?: string;
}

export async function createPdfFromImagesAction(input: CreatePdfFromImagesInput): Promise<CreatePdfFromImagesOutput> {
  if (!input.imageDataUris || input.imageDataUris.length === 0) {
    return { error: 'No image data provided.' };
  }

  try {
    const newPdfDoc = await PDFDocument.create();

    for (const dataUri of input.imageDataUris) {
        if (!dataUri.startsWith('data:image/png;base64,')) {
            console.warn('Skipping non-PNG image data URI during PDF creation from images.');
            continue;
        }
        const pngBytes = Buffer.from(dataUri.split(',')[1], 'base64');
        const pngImage = await newPdfDoc.embedPng(pngBytes);
        
        const page = newPdfDoc.addPage([pngImage.width, pngImage.height]);
        page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: pngImage.width,
            height: pngImage.height,
        });
    }
    
    if (newPdfDoc.getPageCount() === 0) {
        return { error: "No valid images were processed to create the PDF." };
    }

    const pdfBytes = await newPdfDoc.save();
    const pdfDataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;

    return { pdfDataUri };

  } catch (error: any) {
    console.error('Error creating PDF from images:', error);
    return { error: error.message || 'An unexpected error occurred while creating the PDF.' };
  }
}
