
'use server';

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface PageData {
  id: string;
  originalIndex: number;
  width: number;
  height: number;
  rotation: number;
}

export interface GetInitialPageDataInput {
  pdfDataUri: string;
}

export interface GetInitialPageDataOutput {
  pages?: PageData[];
  error?: string;
}

export async function getInitialPageDataAction(input: GetInitialPageDataInput): Promise<GetInitialPageDataOutput> {
  if (!input.pdfDataUri) {
    return { error: "No PDF data provided." };
  }
  try {
    const pdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pagesData: PageData[] = pdfDoc.getPages().map((page, i) => {
      const { width, height } = page.getSize();
      const rotation = page.getRotation().angle;
      return {
        id: crypto.randomUUID(),
        originalIndex: i,
        width,
        height,
        rotation,
      };
    });
    return { pages: pagesData };
  } catch (error: any) {
    console.error("Error in getInitialPageDataAction:", error);
    return { error: error.message || "Failed to load page data from PDF." };
  }
}


export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropPdfInput {
  pdfDataUri: string;
  cropArea: CropArea;
  applyTo: 'all' | 'current';
  currentPage: number; // 1-indexed
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
    
    const pageIndicesToCrop = input.applyTo === 'all'
      ? pdfDoc.getPageIndices()
      : [input.currentPage - 1];

    for (const pageIndex of pageIndicesToCrop) {
        if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue;

        const page = pdfDoc.getPage(pageIndex);
        const { width: originalWidth, height: originalHeight } = page.getSize();
        const rotation = page.getRotation().angle;
        
        const isSideways = rotation === 90 || rotation === 270;
        const visualPageWidth = isSideways ? originalHeight : originalWidth;
        const visualPageHeight = isSideways ? originalWidth : originalHeight;

        const scale = Math.min(
            input.clientCanvasWidth / visualPageWidth,
            input.clientCanvasHeight / visualPageHeight
        );

        const scaledWidthOnClient = visualPageWidth * scale;
        const scaledHeightOnClient = visualPageHeight * scale;

        const offsetXOnClient = (input.clientCanvasWidth - scaledWidthOnClient) / 2;
        const offsetYOnClient = (input.clientCanvasHeight - scaledHeightOnClient) / 2;

        // Convert client-side crop box (relative to the canvas) to coordinates relative to the *scaled* page image.
        const cropX_on_scaled_page = input.cropArea.x - offsetXOnClient;
        const cropY_on_scaled_page = input.cropArea.y - offsetYOnClient;

        // Convert coordinates from the scaled page to the original, unscaled PDF page.
        const cropX_pdf = cropX_on_scaled_page / scale;
        const cropY_pdf = cropY_on_scaled_page / scale;
        const cropWidth_pdf = input.cropArea.width / scale;
        const cropHeight_pdf = input.cropArea.height / scale;

        // Translate coordinates based on page rotation and the fact that pdf-lib's y-origin is at the bottom.
        // The key is to transform the top-left (x, y) coordinate from the visual representation
        // into the bottom-left (x, y) coordinate required by pdf-lib's cropBox, accounting for rotation.
        let finalX_pdf, finalY_pdf;
        
        switch (rotation) {
            case 0:
                finalX_pdf = cropX_pdf;
                finalY_pdf = originalHeight - (cropY_pdf + cropHeight_pdf);
                break;
            case 90:
                finalX_pdf = cropY_pdf;
                finalY_pdf = originalHeight - (cropX_pdf + cropWidth_pdf);
                break;
            case 180:
                finalX_pdf = originalWidth - (cropX_pdf + cropWidth_pdf);
                finalY_pdf = cropY_pdf;
                break;
            case 270:
                finalX_pdf = originalWidth - (cropY_pdf + cropHeight_pdf);
                finalY_pdf = cropX_pdf;
                break;
            default: // Should not happen, but treat as 0
                finalX_pdf = cropX_pdf;
                finalY_pdf = originalHeight - (cropY_pdf + cropHeight_pdf);
                break;
        }
        
        // The width and height for the crop box also need to be swapped for rotated pages.
        const finalWidth_pdf = isSideways ? cropHeight_pdf : cropWidth_pdf;
        const finalHeight_pdf = isSideways ? cropWidth_pdf : cropHeight_pdf;
        
        page.setCropBox(finalX_pdf, finalY_pdf, finalWidth_pdf, finalHeight_pdf);
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
