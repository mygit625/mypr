import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-pdf.ts';
import '@/ai/flows/ocr-image-flow.ts'; // Added this back
import '@/ai/flows/cover-letter-flow.ts';
