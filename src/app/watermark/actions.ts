'use server';

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import type { Buffer } from 'buffer';

export type WatermarkPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 }; // Default to black
}

export interface WatermarkInput {
  pdfDataUri: string;
  text: string;
  fontSize: number;
  fontColor: string; // hex color
  opacity: number;
  rotation: number;
  position: WatermarkPosition;
}

export interface WatermarkOutput {
  watermarkedPdfDataUri?: string;
  error?: string;
}

export async function watermarkPdfAction(input: WatermarkInput): Promise<WatermarkOutput> {
  if (!input.pdfDataUri) {
    return { error: 'No PDF data provided.' };
  }
  if (!input.text.trim()) {
      return { error: 'Watermark text cannot be empty.' };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: 'Invalid PDF data format.' };
    }
    const pdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const color = hexToRgb(input.fontColor);

    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      
      const textWidth = font.widthOfTextAtSize(input.text, input.fontSize);
      
      let x = 0, y = 0;
      const margin = 50;

      // Y positioning
      if (input.position.startsWith('top')) {
        y = height - margin;
      } else if (input.position.startsWith('middle')) {
        y = height / 2;
      } else { // bottom
        y = margin;
      }

      // X positioning
      if (input.position.endsWith('left')) {
        x = margin;
      } else if (input.position.endsWith('center')) {
        x = width / 2 - textWidth / 2;
      } else { // right
        x = width - margin - textWidth;
      }

      page.drawText(input.text, {
        x,
        y,
        size: input.fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity: input.opacity,
        rotate: degrees(input.rotation),
      });
    }

    const watermarkedPdfBytes = await pdfDoc.save();
    const watermarkedPdfDataUri = `data:application/pdf;base64,${Buffer.from(watermarkedPdfBytes).toString('base64')}`;
    
    return { watermarkedPdfDataUri };

  } catch (error: any) {
    console.error('Error adding watermark:', error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
        return { error: 'The PDF is encrypted. Please provide a decrypted PDF.'}
    }
    return { error: error.message || 'An unexpected error occurred.' };
  }
}
