
"use server";

import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface JpgToConvert {
  dataUri: string;
  // filename: string; // Could be used for titles, metadata, etc. in the future
}

export interface ConvertJpgsToPdfInput {
  jpgsToConvert: JpgToConvert[];
  // pageOrientation?: 'portrait' | 'landscape'; // Future enhancement
  // pageSize?: keyof typeof PageSizes; // Future enhancement
}

export interface ConvertJpgsToPdfOutput {
  pdfDataUri?: string;
  error?: string;
}

export async function convertJpgsToPdfAction(input: ConvertJpgsToPdfInput): Promise<ConvertJpgsToPdfOutput> {
  if (!input.jpgsToConvert || input.jpgsToConvert.length === 0) {
    return { error: "No JPG images provided for conversion." };
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const defaultPageSize = PageSizes.A4; // Default to A4 portrait

    for (const jpgItem of input.jpgsToConvert) {
      if (!jpgItem.dataUri.startsWith('data:image/jpeg;base64,')) {
        console.error('Invalid data URI format for a JPG image:', jpgItem.dataUri.substring(0, 100));
        // Skip this image or return an error for the whole batch
        // For now, let's try to continue if possible, or error out if critical
        return { error: `Invalid JPG data format for one of the images. Please ensure all files are valid JPGs.` };
      }
      const jpgBytes = Buffer.from(jpgItem.dataUri.split(',')[1], 'base64');
      const jpgImage = await pdfDoc.embedJpg(jpgBytes);

      const page = pdfDoc.addPage(defaultPageSize);
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      const jpgDims = jpgImage.scale(1); // Get original dimensions

      // Calculate scale to fit image within page while maintaining aspect ratio
      const scale = Math.min(pageWidth / jpgDims.width, pageHeight / jpgDims.height);
      const scaledWidth = jpgDims.width * scale;
      const scaledHeight = jpgDims.height * scale;

      // Center the image on the page
      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;

      page.drawImage(jpgImage, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });
    }

    if (pdfDoc.getPageCount() === 0) {
        return { error: "The PDF could not be created as no valid images were processed."}
    }

    const pdfBytes = await pdfDoc.save();
    const pdfDataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
    
    return { pdfDataUri };

  } catch (error: any) {
    console.error("Error converting JPGs to PDF:", error);
    // More specific error handling could be added here
    if (error.message && error.message.toLowerCase().includes('not a valid jpeg')) {
        return { error: "One of the uploaded files is not a valid JPG image."}
    }
    return { error: error.message || "An unexpected error occurred while converting JPGs to PDF." };
  }
}
