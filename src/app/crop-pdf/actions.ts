'use server';

import { PDFDocument, type PDFPage } from 'pdf-lib';

export interface CropArea {
  x: number; // in pixels, relative to the top-left of the client canvas container
  y: number; // in pixels, relative to the top-left of the client canvas container
  width: number; // in pixels
  height: number; // in pixels
}

export interface CropPdfInput {
  pdfDataUri: string;
  cropArea: CropArea;
  applyTo: 'all' | 'current';
  currentPage: number; // 1-indexed
  // Dimensions of the container that holds the canvas, for calculating offsets
  clientContainerWidth: number;
  clientContainerHeight: number;
  // Dimensions of the actual rendered canvas inside the container
  clientCanvasWidth: number; 
  clientCanvasHeight: number;
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

        const isSideways = rotation === 90 || rotation === 270;
        const visualPageWidth = isSideways ? originalHeight : originalWidth;
        const visualPageHeight = isSideways ? originalWidth : originalHeight;
        
        // This is the correct scale factor, accounting for how the page is fitted inside the canvas.
        const scale = Math.min(
            input.clientCanvasWidth / visualPageWidth,
            input.clientCanvasHeight / visualPageHeight
        );

        // The canvas is centered within its container. We need to account for this offset.
        const offsetX = (input.clientContainerWidth - (visualPageWidth * scale)) / 2;
        const offsetY = (input.clientContainerHeight - (visualPageHeight * scale)) / 2;
        
        // Convert client-side crop box coordinates (relative to the container) to be relative to the unscaled, original page.
        // 1. Subtract the canvas offset to get coordinates relative to the canvas itself.
        // 2. Divide by the scale to convert from canvas pixels to PDF points.
        const cropX = (input.cropArea.x - offsetX) / scale;
        const cropY = (input.cropArea.y - offsetY) / scale;
        const cropWidth = input.cropArea.width / scale;
        const cropHeight = input.cropArea.height / scale;
        
        // pdf-lib's y-coordinate starts from the bottom. Convert our top-down coordinate.
        const finalY = visualPageHeight - (cropY + cropHeight);

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
