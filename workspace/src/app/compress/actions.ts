
'use server';

import { PDFDocument } from 'pdf-lib';
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

    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      updateMetadata: input.compressionLevel !== 'extreme', // Don't update metadata on extreme to strip it
    });

    if (input.compressionLevel === 'extreme') {
      // Clear metadata for potentially smaller size
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
      pdfDoc.setCreationDate(new Date(0));
      pdfDoc.setModificationDate(new Date(0));
    }
    
    // Saving the document with pdf-lib can perform some structural optimizations.
    const compressedPdfBytes = await pdfDoc.save({
        useObjectStreams: true, // This is a key part of pdf-lib's compression
    });
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
