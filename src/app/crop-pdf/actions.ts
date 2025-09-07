
'use server';

import { PDFDocument } from 'pdf-lib';

export interface CreatePdfFromImagesInput {
  imageUris: string[]; // Array of data URIs for the cropped images
}

export interface CreatePdfFromImagesOutput {
  pdfDataUri?: string;
  error?: string;
}

export async function createPdfFromImagesAction(
  input: CreatePdfFromImagesInput
): Promise<CreatePdfFromImagesOutput> {
  if (!input.imageUris || input.imageUris.length === 0) {
    return { error: 'No images were provided to create the PDF.' };
  }

  try {
    const newPdfDoc = await PDFDocument.create();

    for (const imageUri of input.imageUris) {
      let imageBytes: ArrayBuffer;
      if (imageUri.startsWith('data:image/png;base64,')) {
         imageBytes = Buffer.from(imageUri.split(',')[1], 'base64');
         const pngImage = await newPdfDoc.embedPng(imageBytes);
         const page = newPdfDoc.addPage([pngImage.width, pngImage.height]);
         page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: pngImage.width,
            height: pngImage.height,
         });
      } else if (imageUri.startsWith('data:image/jpeg;base64,')) {
         imageBytes = Buffer.from(imageUri.split(',')[1], 'base64');
         const jpgImage = await newPdfDoc.embedJpg(imageBytes);
         const page = newPdfDoc.addPage([jpgImage.width, jpgImage.height]);
         page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: jpgImage.width,
            height: jpgImage.height,
         });
      } else {
        console.warn('Skipping unsupported image format for PDF creation.');
        continue;
      }
    }

    if (newPdfDoc.getPageCount() === 0) {
      return { error: 'No valid images could be processed to create the PDF.' };
    }

    const pdfBytes = await newPdfDoc.save();
    const pdfDataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;

    return { pdfDataUri };
  } catch (error: any) {
    console.error('Error creating PDF from images:', error);
    return { error: error.message || 'An unexpected error occurred while creating the PDF.' };
  }
}
