'use server';

import {
  ocrImage as ocrImageFlow,
  type OcrImageInput,
  type OcrImageOutput,
} from '@/ai/flows/ocr-image-flow';

export async function ocrImageAction(
  input: OcrImageInput
): Promise<OcrImageOutput | {error: string}> {
  try {
    const result = await ocrImageFlow(input);
    return result;
  } catch (error: any) {
    console.error('Error in ocrImageAction:', error);
    return {error: error.message || 'Failed to process image for OCR.'};
  }
}

// Re-export PageData type for client-side page management if needed, similar to other tools
export type {PageData} from '../organize/actions';
