
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
        const { width: originalWidth, height: originalHeight } = page.getSize();
        const rotation = page.getRotation().angle;

        // Determine the visual dimensions of the page after rotation.
        // This is what the user sees and what pdf-js renders.
        const isSideways = rotation === 90 || rotation === 270;
        const visualPageWidth = isSideways ? originalHeight : originalWidth;
        const visualPageHeight = isSideways ? originalWidth : originalHeight;
        
        // Calculate the scale factor based on how the client-side rendering fits the page into the canvas.
        // The client scales the PDF page to fit *within* the canvas dimensions, preserving aspect ratio.
        const scale = Math.min(
            input.clientCanvasWidth / visualPageWidth,
            input.clientCanvasHeight / visualPageHeight
        );

        // Convert the client-side crop coordinates (relative to the canvas container) 
        // into coordinates relative to the original, unscaled, and unrotated page.
        
        // 1. Find the dimensions of the rendered canvas inside the container
        const renderedCanvasWidth = visualPageWidth * scale;
        const renderedCanvasHeight = visualPageHeight * scale;

        // 2. Find the offset (letterboxing) of the canvas within the container
        const canvasXOffset = (input.clientCanvasWidth - renderedCanvasWidth) / 2;
        const canvasYOffset = (input.clientCanvasHeight - renderedCanvasHeight) / 2;
        
        // 3. Translate crop box coordinates to be relative to the canvas itself
        const cropX_relativeToCanvas = input.cropArea.x - canvasXOffset;
        const cropY_relativeToCanvas = input.cropArea.y - canvasYOffset;
        
        // 4. Scale the canvas-relative coordinates back to the page's original coordinate system
        const cropX = cropX_relativeToCanvas / scale;
        const cropY = cropY_relativeToCanvas / scale;
        const cropWidth = input.cropArea.width / scale;
        const cropHeight = input.cropArea.height / scale;
        
        // 5. pdf-lib's y-coordinate starts from the bottom. We need to translate our top-down coordinates.
        // The coordinate system for cropping is based on the VISUAL dimensions.
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
