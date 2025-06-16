
"use server";

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface ConvertWordToPdfInput {
  wordDataUri: string; // Data URI of the Word file
  originalFileName: string;
}

export interface ConvertWordToPdfOutput {
  pdfDataUri?: string;
  error?: string;
}

export async function convertWordToPdfAction(input: ConvertWordToPdfInput): Promise<ConvertWordToPdfOutput> {
  console.log(`Placeholder: Received request to convert Word file: ${input.originalFileName}. Input data URI (first 100 chars): ${input.wordDataUri.substring(0, 100)}`);
  
  // For this placeholder, we will not use the input.wordDataUri to parse the Word file.
  // Instead, we generate a dummy PDF.

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const { width, height } = page.getSize();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Placeholder PDF Document', {
      x: 50,
      y: height - 50,
      font: helveticaFont,
      size: 18,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Original file: ${input.originalFileName}`, {
      x: 50,
      y: height - 80,
      font: helveticaFont,
      size: 10,
      color: rgb(0.3, 0.3, 0.3),
    });

    const message = "This is a placeholder. Full Word-to-PDF conversion is a complex feature and is not implemented in this demonstration version.";
    const textWidth = helveticaFont.widthOfTextAtSize(message, 12);
    const textHeight = helveticaFont.heightAtSize(12);
    
    page.drawText(message, {
      x: (width - textWidth) / 2,
      y: height / 2,
      font: helveticaFont,
      size: 12,
      color: rgb(0.8, 0.2, 0.2), // Reddish color for emphasis
      maxWidth: width - 100,
      lineHeight: 15,
    });

    const pdfBytes = await pdfDoc.save();
    const pdfDataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
    
    return { pdfDataUri };

  } catch (e: any) {
    console.error("Error generating placeholder PDF for Word to PDF:", e);
    return { error: "Failed to generate placeholder PDF. " + e.message };
  }
}
