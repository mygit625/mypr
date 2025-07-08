
"use server";

import { PDFDocument } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface RepairPdfInput {
  pdfDataUri: string;
  originalFileName: string;
}

export interface RepairPdfOutput {
  repairedPdfDataUri?: string;
  error?: string;
}

export async function repairPdfAction(input: RepairPdfInput): Promise<RepairPdfOutput> {
  if (!input.pdfDataUri) {
    return { error: "No PDF file provided for repair." };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      console.error('Invalid data URI format for repair PDF:', input.pdfDataUri.substring(0, 100));
      return { error: `Invalid PDF data format. Please ensure the file is a valid PDF.` };
    }

    const base64String = input.pdfDataUri.split(',')[1];
    const pdfBytes = Buffer.from(base64String, 'base64');

    // Attempt to load the PDF. The ignoreEncryption option can help with some problematic files.
    // The loading process itself can sometimes fail for severely corrupted files.
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      // updateMetadata: false, // May prevent some errors if metadata is corrupt, but might lose metadata
    });

    if (pdfDoc.getPageCount() === 0 && pdfBytes.length > 0) {
      // It's possible to load a "valid" PDF structure that has no pages.
      // Depending on the corruption, this might be the best "repair" possible.
      // Or it might indicate the file was too corrupt to recover pages.
      console.warn(`PDF "${input.originalFileName}" was loaded but found to have 0 pages after attempting repair load.`);
      // We can choose to return an error here, or proceed to save the (empty) document.
      // Let's proceed, as pdf-lib successfully loaded it.
    }
    
    // Saving the document can fix some structural issues.
    // useObjectStreams: true is generally good for optimization.
    const repairedPdfBytes = await pdfDoc.save({
      useObjectStreams: true,
    });

    const repairedPdfDataUri = `data:application/pdf;base64,${Buffer.from(repairedPdfBytes).toString('base64')}`;

    return { repairedPdfDataUri };

  } catch (error: any) {
    console.error(`Error repairing PDF "${input.originalFileName}":`, error);
    // Provide a more generic error message to the user for complex errors.
    let userErrorMessage = "An unexpected error occurred while attempting to repair the PDF. The file might be too corrupted or in an unsupported format.";
    if (error.message) {
        if (error.message.toLowerCase().includes('encrypted document')) {
            userErrorMessage = "The PDF is encrypted and cannot be repaired without decryption. Please provide a decrypted PDF.";
        } else if (error.message.toLowerCase().includes('invalid pdf structure')) {
            userErrorMessage = "The PDF has an invalid structure that could not be repaired.";
        } else if (error.message.toLowerCase().includes('offset')) {
             userErrorMessage = "The PDF file appears to be corrupted or not a valid PDF. (Offset error)";
        }
    }
    return { error: userErrorMessage };
  }
}
