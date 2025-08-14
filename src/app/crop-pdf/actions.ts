
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
  clientCanvasWidth: number; // Width of the rendered canvas on the client
  clientCanvasHeight: number; // Height of the rendered canvas on the client
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
    
    const pagesToCropIndices = input.applyTo === 'all'
      ? pdfDoc.getPageIndices()
      : [input.currentPage - 1];

    for (const pageIndex of pagesToCropIndices) {
        if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue;

        const page = pdfDoc.getPage(pageIndex);
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // The client canvas is scaled to fit. We need to respect its aspect ratio
        // to find the correct scale factor for our calculations.
        const pageAspectRatio = pageWidth / pageHeight;
        const canvasAspectRatio = input.clientCanvasWidth / input.clientCanvasHeight;

        let scale: number;
        if (pageAspectRatio > canvasAspectRatio) {
            // Page is wider than canvas area, so width is the limiting factor
            scale = pageWidth / input.clientCanvasWidth;
        } else {
            // Page is taller or same aspect ratio, so height is the limiting factor
            scale = pageHeight / input.clientCanvasHeight;
        }
        
        const cropX = input.cropArea.x * scale;
        const cropY = input.cropArea.y * scale;
        const cropWidth = input.cropArea.width * scale;
        const cropHeight = input.cropArea.height * scale;

        // pdf-lib's y-coordinate starts from the bottom.
        // The final Y is: page_height - (y_offset_from_top + crop_height)
        const finalY = pageHeight - (cropY + cropHeight);

        page.setCropBox(cropX, finalY, cropWidth, cropHeight);
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
