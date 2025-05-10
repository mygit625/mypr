
"use server";

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import type { Buffer } from 'buffer';

export interface SplitPdfInput {
  pdfDataUri: string;
}

export interface SplitPdfOutput {
  zipDataUri?: string;
  error?: string;
}

export async function splitPdfAction(input: SplitPdfInput): Promise<SplitPdfOutput> {
  if (!input.pdfDataUri) {
    return { error: "No PDF file provided for splitting." };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      console.error('Invalid data URI format for split PDF:', input.pdfDataUri.substring(0,100));
      return { error: `Invalid PDF data format. Please ensure the file is a valid PDF.` };
    }
    const pdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const originalPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const numberOfPages = originalPdf.getPageCount();

    if (numberOfPages === 0) {
      return { error: "The PDF has no pages to split." };
    }
    
    const zip = new JSZip();

    for (let i = 0; i < numberOfPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(originalPdf, [i]);
      newPdf.addPage(copiedPage);
      const pagePdfBytes = await newPdf.save();
      zip.file(`page_${i + 1}.pdf`, pagePdfBytes);
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    const zipDataUri = `data:application/zip;base64,${Buffer.from(zipBytes).toString('base64')}`;

    return { zipDataUri };

  } catch (error: any) {
    console.error("Error splitting PDF:", error);
    return { error: error.message || "An unexpected error occurred while splitting the PDF." };
  }
}
