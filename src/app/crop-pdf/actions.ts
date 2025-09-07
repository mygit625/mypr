
'use server';

import { PDFDocument } from 'pdf-lib';

export interface CreatePdfFromImagesInput {
  imageDataUris: string[]; // Expects data URIs, 'image/png' from canvas
}

export interface CreatePdfFromImagesOutput {
  createdPdfDataUri?: string;
  error?: string;
}

/**
 * Creates a new PDF document from a list of image data URIs.
 * Each image is placed on its own page, sized to the image's dimensions.
 */
export async function createPdfFromImagesAction(
  input: CreatePdfFromImagesInput
): Promise<CreatePdfFromImagesOutput> {
  if (!input.imageDataUris || input.imageDataUris.length === 0) {
    return { error: 'No image data was provided to create the PDF.' };
  }

  try {
    const newPdfDoc = await PDFDocument.create();

    for (const dataUri of input.imageDataUris) {
      // The client now sends PNG data URIs after cropping
      if (!dataUri.startsWith('data:image/png;base64,')) {
        console.warn('An invalid image data URI was provided and skipped.');
        continue;
      }
      const imageBytes = Buffer.from(dataUri.split(',')[1], 'base64');
      const image = await newPdfDoc.embedPng(imageBytes);

      const page = newPdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    if (newPdfDoc.getPageCount() === 0) {
      return { error: 'The PDF could not be created as no valid images were processed.' };
    }

    const createdPdfBytes = await newPdfDoc.save();
    const createdPdfDataUri = `data:application/pdf;base64,${Buffer.from(
      createdPdfBytes
    ).toString('base64')}`;

    return { createdPdfDataUri };
  } catch (error: any) {
    console.error('Error creating PDF from images:', error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
        return { error: 'The source PDF appears to be encrypted, preventing image extraction.'}
    }
    return {
      error:
        error.message ||
        'An unexpected error occurred while creating the PDF from the cropped images.',
    };
  }
}
