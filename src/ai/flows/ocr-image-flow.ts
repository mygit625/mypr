'use server';
/**
 * @fileOverview An AI flow for extracting text from images.
 *
 * - ocrImage - A function that handles text extraction from an image.
 * - OcrImageInput - The input type for the ocrImage function.
 * - OcrImageOutput - The return type for the ocrImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OcrImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type OcrImageInput = z.infer<typeof OcrImageInputSchema>;

const OcrImageOutputSchema = z.object({
  text: z.string().describe('The extracted text from the image.'),
});
export type OcrImageOutput = z.infer<typeof OcrImageOutputSchema>;

export async function ocrImage(input: OcrImageInput): Promise<OcrImageOutput> {
  return ocrImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'ocrImagePrompt',
  input: {schema: OcrImageInputSchema},
  output: {schema: OcrImageOutputSchema},
  prompt: `Extract all visible text from the following image. Respond only with the extracted text.
Image: {{media url=imageDataUri}}`,
});

const ocrImageFlow = ai.defineFlow(
  {
    name: 'ocrImageFlow',
    inputSchema: OcrImageInputSchema,
    outputSchema: OcrImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
