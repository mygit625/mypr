
'use server';

import { PDFDocument, type PDFPage } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface CropArea {
  x: number; // in pixels, relative to the top-left of the client canvas
  y: number; // in pixels, relative to the top-left of the client canvas
  width: number; // in pixels
  height: number; // in pixels
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
        
        const pageAspectRatio = pageWidth / pageHeight;
        const canvasAspectRatio = input.clientCanvasWidth / input.clientCanvasHeight;

        let scale: number;
        if (pageAspectRatio > canvasAspectRatio) {
            // Page is wider than canvas, so it's scaled to fit the width
            scale = pageWidth / input.clientCanvasWidth;
        } else {
            // Page is taller than or equal to canvas aspect ratio, so it's scaled to fit the height
            scale = pageHeight / input.clientCanvasHeight;
        }
        
        // The cropArea values are now relative to the canvas, so direct scaling works.
        const cropX = input.cropArea.x * scale;
        const cropY = input.cropArea.y * scale;
        const cropWidth = input.cropArea.width * scale;
        const cropHeight = input.cropArea.height * scale;
        
        // pdf-lib's y-coordinate starts from the bottom.
        // Final Y is: page_height - (y_offset_from_top + crop_height)
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

