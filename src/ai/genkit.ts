import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// In a production environment managed by apphosting.yaml, 
// process.env.GEMINI_API_KEY will be provided.
// For local development, ensure this is set in your .env.local file.
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.warn(
    'Gemini API key is not set. Please set it in your environment for the application to function correctly.'
  );
}

export const ai = genkit({
  plugins: [googleAI({apiKey: geminiApiKey})],
  model: 'googleai/gemini-2.0-flash',
});
