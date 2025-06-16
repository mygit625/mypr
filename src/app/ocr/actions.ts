"use server";

import { ocrImage as ocrImageFlow, type OcrImageInput, type OcrImageOutput } from "@/ai/flows/ocr-image-flow";

export async function ocrImageAction(input: OcrImageInput): Promise<OcrImageOutput | { error: string }> {
  try {
    // console.log("OCR Image action called with input URI starting with:", input.imageDataUri.substring(0, 100));
    const result = await ocrImageFlow(input);
    // console.log("OCR successful, extracted text:", result.text.substring(0,100) + "...");
    return result;
  } catch (error: any) {
    console.error("Error in OCR Image action:", error);
    return { error: error.message || "Failed to extract text from image. Please try again." };
  }
}
