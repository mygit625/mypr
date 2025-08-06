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
  splitType: 'ranges'; // Simplified as the UI now always works with ranges
  ranges: CustomRange[];
  merge?: boolean; // New option to merge the selected ranges
}

export interface SplitPdfOutput {
  zipDataUri?: string; // Can be a ZIP or a single PDF if merged
  error?: string;
}

export async function splitPdfAction(input: SplitPdfInput): Promise<SplitPdfOutput> {
  if (!input.pdfDataUri) {
    return { error: "No PDF file provided for splitting." };
  }
  if (!input.ranges || input.ranges.length === 0) {
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
    
    // If merging, create a single new PDF
    if (input.merge) {
      const mergedPdf = await PDFDocument.create();
      for (const range of input.ranges) {
        if (range.from < 1 || range.to > totalPages || range.from > range.to) continue;
        const pageIndicesToCopy = Array.from({ length: range.to - range.from + 1 }, (_, i) => range.from - 1 + i);
        if (pageIndicesToCopy.length > 0) {
          const copiedPages = await mergedPdf.copyPages(originalPdf, pageIndicesToCopy);
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
      }
      
      if (mergedPdf.getPageCount() === 0) {
        return { error: "Resulting merged PDF would be empty. No valid pages found in ranges." };
      }
      
      const mergedPdfBytes = await mergedPdf.save();
      // The frontend will treat this as a single file download, so we still use zipDataUri key for simplicity
      const mergedPdfDataUri = `data:application/pdf;base64,${Buffer.from(mergedPdfBytes).toString('base64')}`;
      return { zipDataUri: mergedPdfDataUri };
    }


    // If not merging, create a ZIP file
    const zip = new JSZip();
    const originalFileName = "document";

    for (const range of input.ranges) {
      if (range.from < 1 || range.to > totalPages || range.from > range.to) {
        console.warn(`Invalid range specified: ${range.from}-${range.to}. Skipping.`);
        continue;
      }

      const newPdf = await PDFDocument.create();
      const pageIndicesToCopy = Array.from({ length: range.to - range.from + 1 }, (_, i) => range.from - 1 + i);
      
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

    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    const zipDataUri = `data:application/zip;base64,${Buffer.from(zipBytes).toString('base64')}`;

    return { zipDataUri };

  } catch (error: any) {
    console.error("Error splitting PDF:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
        return { error: "The PDF is encrypted with restrictions that prevent modification."}
    }
    return { error: error.message || "An unexpected error occurred while splitting the PDF." };
  }
}
