import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-pdf.ts';
import '@/ai/flows/ocr-image-flow.ts';
import '@/ai/flows/cover-letter-flow.ts';
