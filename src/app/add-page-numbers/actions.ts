'use server';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Buffer } from 'buffer';

export type PageNumberPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface AddPageNumbersInput {
  pdfDataUri: string;
  position: PageNumberPosition;
  pageRange: string;
  textFormat: string;
  fontSize: number;
  startingNumber: number;
}

export interface AddPageNumbersOutput {
  numberedPdfDataUri?: string;
  error?: string;
}

// Helper function to parse page ranges like "1-5, 7, 9-12"
function parsePageRange(rangeStr: string, totalPages: number): number[] {
  const result = new Set<number>();
  if (!rangeStr.trim()) {
    // If empty, number all pages
    for (let i = 1; i <= totalPages; i++) {
      result.add(i);
    }
    return Array.from(result);
  }

  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart.includes('-')) {
      const [start, end] = trimmedPart.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) {
            result.add(i);
          }
        }
      }
    } else {
      const pageNum = Number(trimmedPart);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        result.add(pageNum);
      }
    }
  }
  return Array.from(result).sort((a, b) => a - b);
}

export async function addPageNumbersAction(input: AddPageNumbersInput): Promise<AddPageNumbersOutput> {
  if (!input.pdfDataUri) {
    return { error: 'No PDF data provided.' };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: 'Invalid PDF data format.' };
    }
    const pdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    const pagesToNumber = parsePageRange(input.pageRange, totalPages);
    if (pagesToNumber.length === 0) {
      return { error: 'The specified page range is invalid or contains no pages within the document.' };
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const margin = 30; // Margin from the edge of the page

    for (let i = 0; i < pagesToNumber.length; i++) {
      const pageNum = pagesToNumber[i];
      const pageIndex = pageNum - 1; // Convert to 0-based index for pdf-lib

      const page = pdfDoc.getPage(pageIndex);
      const { width, height } = page.getSize();

      const pageNumberText = input.textFormat
        .replace('{n}', String(input.startingNumber + i))
        .replace('{N}', String(totalPages));
      
      const textWidth = font.widthOfTextAtSize(pageNumberText, input.fontSize);
      const textHeight = font.heightAtSize(input.fontSize);

      let x: number;
      let y: number;

      switch (input.position) {
        case 'top-left':
          x = margin;
          y = height - margin - textHeight;
          break;
        case 'top-center':
          x = width / 2 - textWidth / 2;
          y = height - margin - textHeight;
          break;
        case 'top-right':
          x = width - margin - textWidth;
          y = height - margin - textHeight;
          break;
        case 'bottom-left':
          x = margin;
          y = margin;
          break;
        case 'bottom-center':
          x = width / 2 - textWidth / 2;
          y = margin;
          break;
        case 'bottom-right':
          x = width - margin - textWidth;
          y = margin;
          break;
      }

      page.drawText(pageNumberText, {
        x,
        y,
        size: input.fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }

    const numberedPdfBytes = await pdfDoc.save();
    const numberedPdfDataUri = `data:application/pdf;base64,${Buffer.from(numberedPdfBytes).toString('base64')}`;
    
    return { numberedPdfDataUri };

  } catch (error: any) {
    console.error('Error adding page numbers:', error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
        return { error: 'The PDF is encrypted. Please provide a decrypted PDF.'}
    }
    return { error: error.message || 'An unexpected error occurred.' };
  }
}
