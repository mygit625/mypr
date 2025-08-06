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
  splitType: 'ranges';
  ranges: CustomRange[];
  merge?: boolean; 
}

export interface SplitPdfOutput {
  zipDataUri?: string; 
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
      const mergedPdfDataUri = `data:application/pdf;base64,${Buffer.from(mergedPdfBytes).toString('base64')}`;
      return { zipDataUri: mergedPdfDataUri };
    }


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

// Helper to parse range strings like "1-3, 5, 8-10"
function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const result = new Set<number>();
  if (!rangeStr.trim()) {
    return [];
  }

  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart.includes('-')) {
      const [start, end] = trimmedPart.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) {
            result.add(i);
          }
        }
      }
    } else {
      const pageNum = Number(trimmedPart);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        result.add(pageNum);
      }
    }
  }
  return Array.from(result).sort((a, b) => a - b);
}


export interface SplitPdfByPagesInput {
  pdfDataUri: string;
  extractMode: 'all' | 'select';
  pagesToExtract: string; // e.g., "1-3,5,8-10"
  merge?: boolean;
}

export async function splitPdfByPagesAction(input: SplitPdfByPagesInput): Promise<SplitPdfOutput> {
  if (!input.pdfDataUri) {
    return { error: "No PDF file provided." };
  }

  try {
     if (!input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
      return { error: `Invalid PDF data format.` };
    }
    const pdfBytes = Buffer.from(input.pdfDataUri.split(',')[1], 'base64');
    const originalPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = originalPdf.getPageCount();

    if (totalPages === 0) {
      return { error: "The PDF has no pages to split." };
    }

    let pagesToProcess: number[]; // 1-indexed page numbers
    if (input.extractMode === 'all') {
      pagesToProcess = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      pagesToProcess = parsePageRanges(input.pagesToExtract, totalPages);
      if (pagesToProcess.length === 0) {
        return { error: "No valid pages were selected in the specified range." };
      }
    }

    if (input.merge) {
      const mergedPdf = await PDFDocument.create();
      const pageIndicesToCopy = pagesToProcess.map(p => p - 1); // convert to 0-indexed
      const copiedPages = await mergedPdf.copyPages(originalPdf, pageIndicesToCopy);
      copiedPages.forEach(page => mergedPdf.addPage(page));

      if (mergedPdf.getPageCount() === 0) {
        return { error: "Resulting merged PDF would be empty." };
      }

      const mergedPdfBytes = await mergedPdf.save();
      const mergedPdfDataUri = `data:application/pdf;base64,${Buffer.from(mergedPdfBytes).toString('base64')}`;
      return { zipDataUri: mergedPdfDataUri };
    } else {
      const zip = new JSZip();
      const originalFileName = "document";

      for (const pageNum of pagesToProcess) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(originalPdf, [pageNum - 1]);
        newPdf.addPage(copiedPage);
        const pagePdfBytes = await newPdf.save();
        zip.file(`${originalFileName}_page_${pageNum}.pdf`, pagePdfBytes);
      }

      if (Object.keys(zip.files).length === 0) {
        return { error: "No files were created. Please check your page selection." };
      }

      const zipBytes = await zip.generateAsync({ type: "uint8array" });
      const zipDataUri = `data:application/zip;base64,${Buffer.from(zipBytes).toString('base64')}`;
      return { zipDataUri };
    }
  } catch (error: any) {
    console.error("Error in splitPdfByPagesAction:", error);
    if (error.message && error.message.toLowerCase().includes('encrypted')) {
        return { error: "The PDF is encrypted and cannot be modified."}
    }
    return { error: error.message || "An unexpected error occurred." };
  }
}
