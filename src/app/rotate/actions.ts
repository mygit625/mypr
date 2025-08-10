'use server';

import { PDFDocument, degrees } from 'pdf-lib';
import type { Buffer } from 'buffer';

// This action is designed to be a self-contained version of the 'organize' action
// to resolve the module export error, providing the same functionality for the rotate page.

interface PageToAssembleInfo {
  sourcePdfDataUri: string;
  pageIndexToCopy: number; // 0-based
  rotation: number;
}

export interface AssembleIndividualPagesForOrganizeInput {
  orderedPagesToAssemble: PageToAssembleInfo[];
}

export interface AssembleIndividualPagesForOrganizeOutput {
  organizedPdfDataUri?: string;
  error?: string;
}

export async function assembleIndividualPagesAction(
  input: AssembleIndividualPagesForOrganizeInput
): Promise<AssembleIndividualPagesForOrganizeOutput> {
  if (!input.orderedPagesToAssemble || input.orderedPagesToAssemble.length === 0) {
    return { error: 'No pages provided to organize and assemble.' };
  }

  const finalPdfDoc = await PDFDocument.create();

  try {
    for (const pageInfo of input.orderedPagesToAssemble) {
      if (!pageInfo.sourcePdfDataUri.startsWith('data:application/pdf;base64,')) {
        console.error(
          'Invalid data URI format for a source PDF in rotation:',
          pageInfo.sourcePdfDataUri.substring(0, 100)
        );
        return {
          error: `Invalid PDF data format for one of the source documents. Please ensure all files are valid PDFs.`,
        };
      }
      const pdfBytes = Buffer.from(
        pageInfo.sourcePdfDataUri.split(',')[1],
        'base64'
      );
      const sourcePdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });

      if (
        pageInfo.pageIndexToCopy < 0 ||
        pageInfo.pageIndexToCopy >= sourcePdfDoc.getPageCount()
      ) {
        console.warn(
          `Invalid page index ${pageInfo.pageIndexToCopy} for a source PDF with ${sourcePdfDoc.getPageCount()} during rotation. Skipping this page.`
        );
        continue;
      }

      if (sourcePdfDoc.getPageCount() === 0) {
        console.warn(
          'A source PDF with no pages was encountered and skipped during rotation.'
        );
        continue;
      }

      const [copiedPage] = await finalPdfDoc.copyPages(sourcePdfDoc, [
        pageInfo.pageIndexToCopy,
      ]);
      copiedPage.setRotation(degrees(pageInfo.rotation)); // Apply rotation
      finalPdfDoc.addPage(copiedPage);
    }

    if (finalPdfDoc.getPageCount() === 0) {
      return {
        error:
          'The organized PDF would be empty. No valid pages were found or selected.',
      };
    }

    const organizedPdfBytes = await finalPdfDoc.save();
    const organizedPdfDataUri = `data:application/pdf;base64,${Buffer.from(
      organizedPdfBytes
    ).toString('base64')}`;

    return { organizedPdfDataUri };
  } catch (error: any) {
    console.error('Error in assembleIndividualPagesAction for Rotate PDF:', error);
    if (
      error.message &&
      error.message.toLowerCase().includes('encrypted') &&
      !error.message.toLowerCase().includes('ignoreencryption')
    ) {
      return {
        error:
          'One of the source PDFs is encrypted with restrictions that prevent modification. Please provide decrypted PDFs.',
      };
    }
    return {
      error:
        error.message ||
        'An unexpected error occurred while assembling the PDF pages for rotation.',
    };
  }
}
