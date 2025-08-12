import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This is a temporary workaround for local development due to persistent issues with env variables.
// In a production environment managed by apphosting.yaml, process.env.GEMINI_API_KEY will be used.
const geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyBnVDKYBs_WhDy7mdSinfm8lWCLA71iHVY';

if (geminiApiKey === 'YOUR_GEMINI_API_KEY' || !geminiApiKey) {
  console.warn(
    'Gemini API key is not set. Please set it in your environment for production.'
  );
}

export const ai = genkit({
  plugins: [googleAI({apiKey: geminiApiKey})],
  model: 'googleai/gemini-2.0-flash',
});
