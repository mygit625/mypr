'use server';

import { PDFDocument } from 'pdf-lib';

export interface PageData {
  id: string;
  originalIndex: number;
  width: number;
  height: number;
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
      return {
        id: crypto.randomUUID(),
        originalIndex: i,
        width,
        height,
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
  previewContainerWidth: number;
  previewContainerHeight: number;
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
        
        const scale = Math.min(
            input.previewContainerWidth / originalWidth,
            input.previewContainerHeight / originalHeight
        );

        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;

        const offsetX = (input.previewContainerWidth - scaledWidth) / 2;
        const offsetY = (input.previewContainerHeight - scaledHeight) / 2;

        const cropX_pdf = (input.cropArea.x - offsetX) / scale;
        const cropY_pdf = (input.cropArea.y - offsetY) / scale;
        const cropWidth_pdf = input.cropArea.width / scale;
        const cropHeight_pdf = input.cropArea.height / scale;

        const finalY_pdf = originalHeight - (cropY_pdf + cropHeight_pdf);
        
        page.setCropBox(cropX_pdf, finalY_pdf, cropWidth_pdf, cropHeight_pdf);
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