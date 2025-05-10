"use server";

import { summarizePdf as summarizePdfFlow, type SummarizePdfInput, type SummarizePdfOutput } from "@/ai/flows/summarize-pdf";

export async function summarizePdfAction(input: SummarizePdfInput): Promise<SummarizePdfOutput | { error: string }> {
  try {
    console.log("Summarize PDF action called with input URI starting with:", input.pdfDataUri.substring(0, 100));
    const result = await summarizePdfFlow(input);
    console.log("Summarization successful, summary:", result.summary.substring(0,100) + "...");
    return result;
  } catch (error: any) {
    console.error("Error summarizing PDF in action:", error);
    return { error: error.message || "Failed to summarize PDF. Please try again." };
  }
}
