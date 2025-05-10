
"use server";

import { PDFDocument } from 'pdf-lib';
// Node.js Buffer should be available in Next.js server actions.
// Explicit import for type safety if using a specific Buffer type.
import type { Buffer } from 'buffer'; 

export interface CompressPdfInput {
  pdfDataUri: string;
}

export interface CompressPdfOutput {
  compressedPdfDataUri?: string;
  originalSize?: number;
  compressedSize?: number;
  error?: string;
}

export async function compressPdfAction(input: CompressPdfInput): Promise<CompressPdfOutput> {
  if (!input.pdfDataUri) {
    return { error: "No PDF file provided for compression." };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      console.error('Invalid data URI format for compress PDF:', input.pdfDataUri.substring(0,100));
      return { error: `Invalid PDF data format. Please ensure the file is a valid PDF.` };
    }
    
    const base64String = input.pdfDataUri.split(',')[1];
    const pdfBytes = Buffer.from(base64String, 'base64');
    const originalSize = pdfBytes.length;

    // Load the PDF document
    // ignoreEncryption is true to attempt processing, but some encrypted files might still fail.
    const pdfDoc = await PDFDocument.load(pdfBytes, { 
        ignoreEncryption: true,
    });
    
    // pdf-lib automatically attempts to optimize the PDF structure on save.
    // This step rebuilds the PDF, which can reduce size by optimizing object usage and structure.
    // For more advanced compression (e.g., image re-compression), external libraries or tools would be needed.
    const compressedPdfBytes = await pdfDoc.save({
        useObjectStreams: true, // This is default in recent pdf-lib versions and helps with size.
    });
    const compressedSize = compressedPdfBytes.length;

    // Ensure the document is not empty before creating a data URI
    if (compressedSize === 0 && pdfDoc.getPageCount() > 0) {
        // This might indicate an issue if an empty PDF is generated from a non-empty source
        console.warn("Compression resulted in an empty PDF document, but original had pages.");
    }
     if (pdfDoc.getPageCount() === 0 && originalSize > 0) {
        console.warn("Original PDF had no pages.");
        // It might be valid to return an empty PDF if the original was empty or invalid
    }


    const compressedPdfDataUri = `data:application/pdf;base64,${Buffer.from(compressedPdfBytes).toString('base64')}`;
    
    return { compressedPdfDataUri, originalSize, compressedSize };

  } catch (error: any) {
    console.error("Error compressing PDF:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted') && !error.message.toLowerCase().includes('ignoreencryption')) {
        return { error: "The PDF is encrypted with restrictions that prevent modification. Please provide a decrypted PDF."}
    }
    return { error: error.message || "An unexpected error occurred while compressing the PDF." };
  }
}
