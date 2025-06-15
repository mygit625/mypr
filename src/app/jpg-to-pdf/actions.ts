
"use server";

import { PDFDocument, PageSizes } from 'pdf-lib';
import type { Buffer } from 'buffer';

export interface JpgToConvert {
  dataUri: string;
  filename: string; 
}

// --- Action for converting MULTIPLE JPGs to a single PDF ---
export interface ConvertJpgsToPdfInput {
  jpgsToConvert: JpgToConvert[];
}

export interface ConvertJpgsToPdfOutput {
  pdfDataUri?: string;
  error?: string;
}

export async function convertJpgsToPdfAction(input: ConvertJpgsToPdfInput): Promise<ConvertJpgsToPdfOutput> {
  if (!input.jpgsToConvert || input.jpgsToConvert.length === 0) {
    return { error: "No JPG images provided for conversion." };
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const defaultPageSize = PageSizes.A4; 

    for (const jpgItem of input.jpgsToConvert) {
      if (!jpgItem.dataUri.startsWith('data:image/jpeg;base64,')) {
        console.error('Invalid data URI format for a JPG image (batch):', jpgItem.dataUri.substring(0, 100));
        return { error: `Invalid JPG data format for one of the images. Please ensure all files are valid JPGs.` };
      }
      const jpgBytes = Buffer.from(jpgItem.dataUri.split(',')[1], 'base64');
      const jpgImage = await pdfDoc.embedJpg(jpgBytes);

      const page = pdfDoc.addPage(defaultPageSize);
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      const jpgDims = jpgImage.scale(1); 

      const scale = Math.min(pageWidth / jpgDims.width, pageHeight / jpgDims.height);
      const scaledWidth = jpgDims.width * scale;
      const scaledHeight = jpgDims.height * scale;

      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;

      page.drawImage(jpgImage, { x, y, width: scaledWidth, height: scaledHeight });
    }

    if (pdfDoc.getPageCount() === 0) {
        return { error: "The PDF could not be created as no valid images were processed."}
    }

    const pdfBytes = await pdfDoc.save();
    const pdfDataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
    
    return { pdfDataUri };

  } catch (error: any) {
    console.error("Error converting JPGs to PDF (batch):", error);
    if (error.message && error.message.toLowerCase().includes('not a valid jpeg')) {
        return { error: "One of the uploaded files is not a valid JPG image."}
    }
    return { error: error.message || "An unexpected error occurred while converting JPGs to PDF." };
  }
}


// --- Action for converting a SINGLE JPG to a PDF ---
export interface ConvertSingleJpgToPdfInput {
  jpgDataUri: string;
  filename: string; // Original filename to use for the PDF
}

export interface ConvertSingleJpgToPdfOutput {
  pdfDataUri?: string;
  error?: string;
}

export async function convertSingleJpgToPdfAction(input: ConvertSingleJpgToPdfInput): Promise<ConvertSingleJpgToPdfOutput> {
  if (!input.jpgDataUri) {
    return { error: "No JPG image data provided for conversion." };
  }
  if (!input.filename) {
    return { error: "Filename not provided for the output PDF." };
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const defaultPageSize = PageSizes.A4;

    if (!input.jpgDataUri.startsWith('data:image/jpeg;base64,')) {
      console.error('Invalid data URI format for single JPG image:', input.jpgDataUri.substring(0, 100));
      return { error: `Invalid JPG data format. Please ensure the file is a valid JPG.` };
    }
    const jpgBytes = Buffer.from(input.jpgDataUri.split(',')[1], 'base64');
    const jpgImage = await pdfDoc.embedJpg(jpgBytes);

    const page = pdfDoc.addPage(defaultPageSize);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    
    const jpgDims = jpgImage.scale(1);

    const scale = Math.min(pageWidth / jpgDims.width, pageHeight / jpgDims.height);
    const scaledWidth = jpgDims.width * scale;
    const scaledHeight = jpgDims.height * scale;

    const x = (pageWidth - scaledWidth) / 2;
    const y = (pageHeight - scaledHeight) / 2;

    page.drawImage(jpgImage, { x, y, width: scaledWidth, height: scaledHeight });

    const pdfBytes = await pdfDoc.save();
    const pdfDataUri = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
    
    return { pdfDataUri };

  } catch (error: any) {
    console.error("Error converting single JPG to PDF:", error);
    if (error.message && error.message.toLowerCase().includes('not a valid jpeg')) {
        return { error: "The uploaded file is not a valid JPG image."}
    }
    return { error: error.message || "An unexpected error occurred while converting the JPG to PDF." };
  }
}
