
'use server';

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface CropArea {
  x: number; // in pixels, relative to the top-left of the client container
  y: number; // in pixels, relative to the top-left of the client container
  width: number; // in pixels
  height: number; // in pixels
}

export interface CropPdfInput {
  pdfDataUri: string;
  cropArea: CropArea;
  applyTo: 'all' | 'current';
  currentPage: number; // 1-indexed
  clientCanvasWidth: number; // Actual rendered width of the canvas
  clientCanvasHeight: number; // Actual rendered height of the canvas
  clientContainerWidth: number; // Width of the container div holding the canvas
  clientContainerHeight: number; // Height of the container div holding the canvas
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

        // Determine the visual dimensions of the page as rendered by pdf-js.
        const isSideways = rotation === 90 || rotation === 270;
        const visualPageWidth = isSideways ? originalHeight : originalWidth;
        const visualPageHeight = isSideways ? originalWidth : originalHeight;
        
        // Calculate the scale factor based on how pdf-js fits the visual page into the client's canvas.
        const scale = Math.min(
            input.clientCanvasWidth / visualPageWidth,
            input.clientCanvasHeight / visualPageHeight
        );
        
        // Calculate the actual dimensions of the rendered PDF image on the canvas.
        const renderedPdfWidth = visualPageWidth * scale;
        const renderedPdfHeight = visualPageHeight * scale;

        // Calculate the offsets (letterboxing/pillarboxing) of the rendered PDF within the container.
        const offsetX = (input.clientContainerWidth - renderedPdfWidth) / 2;
        const offsetY = (input.clientContainerHeight - renderedPdfHeight) / 2;

        // Convert the container-relative crop box to be relative to the rendered PDF image.
        const cropX_relative = input.cropArea.x - offsetX;
        const cropY_relative = input.cropArea.y - offsetY;

        // Convert the client-side pixel coordinates to the PDF's internal point system.
        const cropX = cropX_relative / scale;
        const cropY = cropY_relative / scale;
        const cropWidth = input.cropArea.width / scale;
        const cropHeight = input.cropArea.height / scale;
        
        // pdf-lib's y-coordinate starts from the bottom. Translate our top-down coordinates.
        const finalY = visualPageHeight - (cropY + cropHeight);

        // Apply the crop box. pdf-lib handles the rotation correctly internally.
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
