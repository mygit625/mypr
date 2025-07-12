'use server';
/**
 * @fileOverview An AI flow for generating personalized cover letters.
 *
 * - generateCoverLetter - A function that handles the cover letter generation process.
 * - GenerateCoverLetterInput - The input type for the generateCoverLetter function.
 * - GenerateCoverLetterOutput - The return type for the generateCoverLetter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCoverLetterInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job being applied for.'),
  company: z.string().describe('The name of the company.'),
  location: z.string().optional().describe('The location of the job.'),
  jobDescription: z.string().describe('The full job description.'),
  cvDataUri: z
    .string()
    .describe(
      "The user's CV or resume, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  creativityLevel: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'A creativity level from 0 (very formal) to 1 (very creative).'
    ),
  wittyRemark: z.boolean().describe('Whether to include a witty remark at the end.'),
});
export type GenerateCoverLetterInput = z.infer<typeof GenerateCoverLetterInputSchema>;

const GenerateCoverLetterOutputSchema = z.object({
  coverLetter: z.string().describe('The generated cover letter text.'),
});
export type GenerateCoverLetterOutput = z.infer<typeof GenerateCoverLetterOutputSchema>;

export async function generateCoverLetter(
  input: GenerateCoverLetterInput
): Promise<GenerateCoverLetterOutput> {
  return generateCoverLetterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'coverLetterPrompt',
  input: {schema: GenerateCoverLetterInputSchema},
  output: {schema: GenerateCoverLetterOutputSchema},
  prompt: `You are an expert career advisor and cover letter writer. Your task is to generate a compelling and personalized cover letter based on the provided job information and the user's CV.

The tone of the cover letter should be adjusted based on the 'creativityLevel'. A value of 0 should be highly professional and formal. A value of 1 should be more creative, personal, and engaging.

Analyze the user's CV to extract key skills, experiences, and achievements. Then, analyze the job description to understand the key requirements and responsibilities.

Craft a cover letter that bridges the user's qualifications from their CV with the needs outlined in the job description. Highlight the most relevant aspects of their background.

The cover letter should have a clear structure:
1.  Introduction: State the position being applied for and where it was seen.
2.  Body Paragraphs: Connect the user's skills and experiences to the job requirements. Provide specific examples.
3.  Closing Paragraph: Reiterate interest in the role and express enthusiasm for the opportunity. Include a call to action.

{{#if wittyRemark}}
Include a short, clever, and contextually appropriate witty remark at the very end of the letter, after the main closing.
{{/if}}

Here is the information to use:

**Job Details:**
- Job Title: {{{jobTitle}}}
- Company: {{{company}}}
- Location: {{{location}}}
- Job Description:
{{{jobDescription}}}

**User's CV:**
{{media url=cvDataUri}}

Generate the cover letter now.`,
});

const generateCoverLetterFlow = ai.defineFlow(
  {
    name: 'generateCoverLetterFlow',
    inputSchema: GenerateCoverLetterInputSchema,
    outputSchema: GenerateCoverLetterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
