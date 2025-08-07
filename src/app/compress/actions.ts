
'use server';

// Polyfill for Promise.withResolvers if needed
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}


import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy, PDFPageProxy, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { createCanvas, type Canvas } from 'canvas';
import type { Buffer } from 'buffer';

export type CompressionLevel = "extreme" | "recommended" | "less";

export interface CompressPdfInput {
  pdfDataUri: string;
  compressionLevel: CompressionLevel;
}

export interface CompressPdfOutput {
  compressedPdfDataUri?: string;
  originalSize?: number;
  compressedSize?: number;
  error?: string;
}

// Node.js environment-specific canvas factory
const nodeCanvasFactory = {
  create: (width: number, height: number) => {
    const canvas = createCanvas(width, height);
    return {
      canvas,
      context: canvas.getContext('2d'),
    };
  },
  reset: (obj: { canvas: Canvas; context: any }, width: number, height: number) => {
    obj.canvas.width = width;
    obj.canvas.height = height;
  },
  destroy: (obj: { canvas: Canvas; context: any }) => {
    obj.canvas.width = 0;
    obj.canvas.height = 0;
    // @ts-ignore
    obj.canvas = null;
    // @ts-ignore
    obj.context = null;
  },
};

const getCompressionSettings = (level: CompressionLevel) => {
  switch (level) {
    case "extreme":
      return { quality: 0.5, scale: 1.0 }; // 50% quality, 150 DPI
    case "recommended":
      return { quality: 0.7, scale: 1.5 }; // 70% quality, 220 DPI
    case "less":
      return { quality: 0.9, scale: 2.0 }; // 90% quality, 300 DPI
    default:
      return { quality: 0.7, scale: 1.5 };
  }
};


export async function compressPdfAction(input: CompressPdfInput): Promise<CompressPdfOutput> {
  if (!input.pdfDataUri) {
    return { error: "No PDF file provided for compression." };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: `Invalid PDF data format.` };
    }

    const base64String = input.pdfDataUri.split(',')[1];
    const pdfBytes = Buffer.from(base64String, 'base64');
    const originalSize = pdfBytes.length;

    const { quality, scale } = getCompressionSettings(input.compressionLevel);

    const newPdfDoc = await PDFDocument.create();
    const pdfDoc: PDFDocumentProxy = await pdfjsLib.getDocument({ data: pdfBytes.buffer }).promise;
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page: PDFPageProxy = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });
        
        const canvasAndContext = nodeCanvasFactory.create(viewport.width, viewport.height);
        const renderContext: RenderParameters = {
            canvasContext: canvasAndContext.context,
            viewport: viewport,
            canvasFactory: nodeCanvasFactory as any,
        };

        await page.render(renderContext).promise;

        const jpgImageBytes = canvasAndContext.canvas.toBuffer('image/jpeg', { quality });
        const jpgImage = await newPdfDoc.embedJpg(jpgImageBytes);
        
        const newPage = newPdfDoc.addPage([jpgImage.width, jpgImage.height]);
        newPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: jpgImage.width,
            height: jpgImage.height,
        });

        nodeCanvasFactory.destroy(canvasAndContext);
        page.cleanup();
    }
    
    if (typeof (pdfDoc as any).destroy === 'function') {
        await (pdfDoc as any).destroy();
    }

    const compressedPdfBytes = await newPdfDoc.save();
    const compressedSize = compressedPdfBytes.length;

    const compressedPdfDataUri = `data:application/pdf;base64,${Buffer.from(compressedPdfBytes).toString('base64')}`;

    return {
      compressedPdfDataUri,
      originalSize,
      compressedSize,
    };

  } catch (error: any) {
    console.error(`Error compressing PDF:`, error);
    let userErrorMessage = "An unexpected error occurred while compressing the PDF.";
     if (error.message && error.message.toLowerCase().includes('encrypted')) {
        userErrorMessage = "The PDF is encrypted and cannot be compressed. Please provide a decrypted PDF.";
    } else if (error.message.toLowerCase().includes('invalid pdf structure')) {
        userErrorMessage = "The PDF has an invalid structure that could not be processed.";
    }
    return { error: userErrorMessage };
  }
}
