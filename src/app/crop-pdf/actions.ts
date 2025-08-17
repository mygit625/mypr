'use server';

import { PDFDocument } from 'pdf-lib';

export interface CreatePdfFromImagesInput {
  imageDataUris: string[];
}

export interface CreatePdfFromImagesOutput {
  processedPdfDataUri?: string;
  error?: string;
}

export async function createPdfFromImagesAction(input: CreatePdfFromImagesInput): Promise<CreatePdfFromImagesOutput> {
  if (!input.imageDataUris || input.imageDataUris.length === 0) {
    return { error: 'No image data was provided to create the PDF.' };
  }

  try {
    const newPdfDoc = await PDFDocument.create();

    for (const dataUri of input.imageDataUris) {
      const imageBytes = Buffer.from(dataUri.split(',')[1], 'base64');
      
      let embeddedImage;
      if (dataUri.startsWith('data:image/png')) {
        embeddedImage = await newPdfDoc.embedPng(imageBytes);
      } else {
        // This logic is kept for flexibility, though the client currently sends PNGs.
        embeddedImage = await newPdfDoc.embedJpg(imageBytes);
      }
      
      const page = newPdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
      
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: embeddedImage.width,
        height: embeddedImage.height,
      });
    }
    
    if (newPdfDoc.getPageCount() === 0) {
        return { error: "Could not create PDF as no valid images were processed." };
    }

    const processedPdfBytes = await newPdfDoc.save();
    const processedPdfDataUri = `data:application/pdf;base64,${Buffer.from(processedPdfBytes).toString('base64')}`;

    return { processedPdfDataUri };

  } catch (error: any) {
    console.error('Error creating PDF from images:', error);
    return { error: error.message || 'An unexpected error occurred while creating the PDF.' };
  }
}
