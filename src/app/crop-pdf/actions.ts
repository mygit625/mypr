
'use server';

import { PDFDocument } from 'pdf-lib';
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
        const { width: originalWidth, height: originalHeight } = page.getSize();
        const rotation = page.getRotation().angle;

        // Determine the visual dimensions of the page after rotation, as seen by the user.
        const isSideways = rotation === 90 || rotation === 270;
        const visualPageWidth = isSideways ? originalHeight : originalWidth;
        const visualPageHeight = isSideways ? originalWidth : originalHeight;
        
        // Calculate the actual scale factor the client used to render the page inside the canvas.
        // The client fits the page within the canvas, preserving aspect ratio.
        const scale = Math.min(
            input.clientCanvasWidth / visualPageWidth,
            input.clientCanvasHeight / visualPageHeight
        );

        // Convert the client's canvas-relative pixel coordinates to the PDF's internal point system.
        const cropX = input.cropArea.x / scale;
        const cropY = input.cropArea.y / scale;
        const cropWidth = input.cropArea.width / scale;
        const cropHeight = input.cropArea.height / scale;
        
        // pdf-lib's y-coordinate starts from the bottom. We need to translate our top-down coordinates.
        const finalY = visualPageHeight - (cropY + cropHeight);

        // Apply the crop box. pdf-lib handles rotation correctly internally.
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
