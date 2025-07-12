"use server";

import {
  generateCoverLetter,
  type GenerateCoverLetterInput,
  type GenerateCoverLetterOutput,
} from "@/ai/flows/cover-letter-flow";

export async function generateCoverLetterAction(
  input: GenerateCoverLetterInput
): Promise<GenerateCoverLetterOutput | { error: string }> {
  try {
    const result = await generateCoverLetter(input);
    return result;
  } catch (error: any) {
    console.error("Error in generateCoverLetterAction:", error);
    return {
      error:
        error.message ||
        "An unexpected error occurred while generating the cover letter.",
    };
  }
}
