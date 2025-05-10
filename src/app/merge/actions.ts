
"use server";

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface MergePdfsInput {
  pdfDataUris: string[];
}

export interface MergePdfsOutput {
  mergedPdfDataUri?: string;
  error?: string;
}

export async function mergePdfsAction(input: MergePdfsInput): Promise<MergePdfsOutput> {
  if (!input.pdfDataUris || input.pdfDataUris.length < 2) {
    return { error: "At least two PDF files are required to merge." };
  }

  try {
    const mergedPdf = await PDFDocument.create();

    for (const dataUri of input.pdfDataUris) {
      if (!dataUri.startsWith('data:application/pdf;base64,')) {
        console.error('Invalid data URI format for a PDF:', dataUri.substring(0,100));
        return { error: `Invalid PDF data format for one of the files. Please ensure all files are valid PDFs.` };
      }
      // Ensure global Buffer is available or use a polyfill if in a non-Node.js serverless env without it.
      // For Next.js server actions, Buffer should typically be available.
      const pdfBytes = Buffer.from(dataUri.split(',')[1], 'base64');
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    const mergedPdfBytes = await mergedPdf.save();
    const mergedPdfDataUri = `data:application/pdf;base64,${Buffer.from(mergedPdfBytes).toString('base64')}`;
    
    return { mergedPdfDataUri };

  } catch (error: any) {
    console.error("Error merging PDFs:", error);
    return { error: error.message || "An unexpected error occurred while merging PDFs." };
  }
}
