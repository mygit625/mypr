
'use server';

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

// This is a new, simplified server action.
// It takes pre-cropped images (as data URIs) from the client and assembles them into a PDF.
// This eliminates all complex server-side geometry calculations, which was the source of the previous errors.

export interface CreatePdfFromImagesInput {
  // An array of data URIs, each representing a cropped and compressed page image (e.g., JPEG).
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
      } else if (dataUri.startsWith('data:image/jpeg')) {
        embeddedImage = await newPdfDoc.embedJpg(imageBytes);
      } else {
        console.warn('Unsupported image type for PDF embedding, skipping:', dataUri.substring(0, 30));
        continue;
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
