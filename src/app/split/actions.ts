
"use server";

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import type { Buffer } from 'buffer';

export interface CustomRange {
  from: number; // 1-indexed
  to: number;   // 1-indexed
}

export interface SplitPdfInput {
  pdfDataUri: string;
  // 'ranges' type is for custom user-defined ranges.
  // 'allPages' can be a mode where each page becomes a separate PDF.
  splitType: 'ranges' | 'allPages'; 
  ranges?: CustomRange[];
}

export interface SplitPdfOutput {
  zipDataUri?: string;
  error?: string;
}

export async function splitPdfAction(input: SplitPdfInput): Promise<SplitPdfOutput> {
  if (!input.pdfDataUri) {
    return { error: "No PDF file provided for splitting." };
  }
  if (input.splitType === 'ranges' && (!input.ranges || input.ranges.length === 0)) {
    return { error: "No ranges provided for splitting." };
  }

  try {
    if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      console.error('Invalid data URI format for split PDF:', input.pdfDataUri.substring(0,100));
      return { error: `Invalid PDF data format. Please ensure the file is a valid PDF.` };
    }
    const pdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const originalPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = originalPdf.getPageCount();

    if (totalPages === 0) {
      return { error: "The PDF has no pages to split." };
    }
    
    const zip = new JSZip();
    const originalFileName = "document"; // Placeholder, could be derived from actual file name if passed

    if (input.splitType === 'allPages') {
      // Current behavior: split every page into a separate file
      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(originalPdf, [i]);
        newPdf.addPage(copiedPage);
        const pagePdfBytes = await newPdf.save();
        zip.file(`${originalFileName}_page_${i + 1}.pdf`, pagePdfBytes);
      }
    } else if (input.splitType === 'ranges' && input.ranges) {
      for (const range of input.ranges) {
        // Validate range
        if (range.from < 1 || range.to > totalPages || range.from > range.to) {
          console.warn(`Invalid range specified: ${range.from}-${range.to}. Skipping.`);
          continue; 
        }

        const newPdf = await PDFDocument.create();
        // Convert 1-indexed to 0-indexed for pdf-lib
        const pageIndicesToCopy = [];
        for (let i = range.from - 1; i < range.to; i++) {
          pageIndicesToCopy.push(i);
        }
        
        if (pageIndicesToCopy.length === 0) {
            console.warn(`Empty page selection for range ${range.from}-${range.to}. Skipping.`);
            continue;
        }

        const copiedPages = await newPdf.copyPages(originalPdf, pageIndicesToCopy);
        copiedPages.forEach((page) => newPdf.addPage(page));
        
        const pagePdfBytes = await newPdf.save();
        const rangeSuffix = range.from === range.to ? `page_${range.from}` : `pages_${range.from}-${range.to}`;
        zip.file(`${originalFileName}_${rangeSuffix}.pdf`, pagePdfBytes);
      }
       if (Object.keys(zip.files).length === 0) {
        return { error: "No valid pages were selected based on the provided ranges. The resulting ZIP file would be empty." };
      }
    } else {
      return { error: "Invalid split type or missing parameters." };
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    const zipDataUri = `data:application/zip;base64,${Buffer.from(zipBytes).toString('base64')}`;

    return { zipDataUri };

  } catch (error: any) {
    console.error("Error splitting PDF:", error);
    return { error: error.message || "An unexpected error occurred while splitting the PDF." };
  }
}
