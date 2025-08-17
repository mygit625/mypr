
'use server';

import { PDFDocument } from 'pdf-lib';

// This server action takes pre-cropped images (as data URIs) from the client
// and assembles them into a new PDF document.

export interface CreatePdfFromImagesInput {
  // An array of data URIs, each representing a cropped page image.
  // The client-side logic currently generates PNGs.
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
      if (!dataUri.startsWith('data:image/png;base64,')) {
         console.warn('Unsupported image type for PDF embedding, skipping:', dataUri.substring(0, 40));
         continue; // Skip any non-PNG data URIs
      }
      
      const imageBytes = Buffer.from(dataUri.split(',')[1], 'base64');
      const embeddedImage = await newPdfDoc.embedPng(imageBytes);
      
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
