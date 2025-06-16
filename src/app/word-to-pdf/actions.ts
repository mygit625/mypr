
"use server";

import { PDFDocument, PageSizes, image } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface ConvertWordToPdfInput {
  pageImageUris: string[]; // Array of image data URIs (one for each page)
  originalFileName: string;
}

export interface ConvertWordToPdfOutput {
  pdfDataUri?: string;
  error?: string;
}

export async function convertWordToPdfAction(input: ConvertWordToPdfInput): Promise<ConvertWordToPdfOutput> {
  if (!input.pageImageUris || input.pageImageUris.length === 0) {
    return { error: "No page images provided for PDF conversion." };
  }

  console.log(`Received ${input.pageImageUris.length} images for Word file: ${input.originalFileName}`);

  try {
    const pdfDoc = await PDFDocument.create();

    for (const imageUri of input.pageImageUris) {
      let imageBytes: Uint8Array;
      let embeddedImage;

      if (imageUri.startsWith('data:image/jpeg;base64,')) {
        imageBytes = Buffer.from(imageUri.split(',')[1], 'base64');
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } else if (imageUri.startsWith('data:image/png;base64,')) {
        imageBytes = Buffer.from(imageUri.split(',')[1], 'base64');
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else {
        console.warn(`Skipping unsupported image format for page: ${imageUri.substring(0, 30)}...`);
        continue; // Skip unsupported formats
      }

      const page = pdfDoc.addPage(PageSizes.A4); // Or use image dimensions
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Scale image to fit page while maintaining aspect ratio
      const imageDims = embeddedImage.scaleToFit(pageWidth, pageHeight);
      
      page.drawImage(embeddedImage, {
        x: (pageWidth - imageDims.width) / 2,
        y: (pageHeight - imageDims.height) / 2,
        width: imageDims.width,
        height: imageDims.height,
      });
    }

    if (pdfDoc.getPageCount() === 0) {
      return { error: "Could not create PDF. No valid page images were processed." };
    }

    const pdfBytes = await pdfDoc.save();
    const pdfDataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
    
    return { pdfDataUri };

  } catch (e: any) {
    console.error("Error creating PDF from page images (Word to PDF):", e);
    return { error: "Failed to create PDF from Word document images. " + e.message };
  }
}
