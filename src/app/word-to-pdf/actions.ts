
"use server";

import PDFDocument from 'pdfkit';
import mammoth from 'mammoth';
import type { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';
import { franc } from 'franc';

export interface ConvertWordToPdfInput {
  docxFileBase64: string;
  originalFileName: string;
}

export interface ConvertWordToPdfOutput {
  pdfDataUri?: string;
  error?: string;
}

export async function convertWordToPdfAction(input: ConvertWordToPdfInput): Promise<ConvertWordToPdfOutput> {
  if (!input.docxFileBase64) {
    return { error: "No DOCX file data provided for conversion." };
  }

  console.log(`Attempting to convert Word file: ${input.originalFileName}.`);

  try {
    const docxFileBuffer = Buffer.from(input.docxFileBase64, 'base64');
    if (docxFileBuffer.length === 0) {
      return { error: "Empty DOCX file data received after base64 decoding." };
    }

    // 1. Convert to HTML and then to plain text
    const htmlResult = await mammoth.convertToHtml({ buffer: docxFileBuffer });
    const html = htmlResult.value;
    const textContent = html
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<\/p>/gi, '\n')
        .replace(/<br[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

    // 2. Detect language from extracted text
    const lang = franc(textContent, { minLength: 3, only: ['cmn', 'aze'] });
    console.log(`Detected language code: ${lang}`);

    // 3. Choose font based on language
    let fontFileName: string;
    let fontNameForRegistration: string;
    
    // ISO 639-3 code for Mandarin Chinese is 'cmn'
    if (lang === 'cmn') {
      fontFileName = 'NotoSansSC-Regular.otf';
      fontNameForRegistration = 'NotoSansSC';
      console.log('Chinese detected, selecting Noto Sans SC font.');
    } else {
      // Default to DejaVuSans for Azerbaijani and others
      fontFileName = 'DejaVuSans.ttf';
      fontNameForRegistration = 'DejaVuSans';
      console.log('Defaulting to DejaVu Sans font.');
    }

    // 4. Load the chosen font
    const fontPath = path.join(process.cwd(), 'src', 'assets', 'fonts', fontFileName);
    let fontBuffer: Buffer | null = null;
    let customFontLoaded = false;
    if (fs.existsSync(fontPath)) {
      fontBuffer = fs.readFileSync(fontPath);
      if (fontBuffer.length > 0) {
        customFontLoaded = true;
        console.log(`Successfully loaded font: ${fontFileName}`);
      } else {
        console.warn(`Font file found at ${fontPath}, but it is empty.`);
      }
    } else {
      const errorMessage = `Font file not found at '${fontPath}'. Please ensure '${fontFileName}' is placed in the 'src/assets/fonts/' directory.`;
      console.error(errorMessage);
      return { error: errorMessage };
    }

    // 5. Extract images
    const images: { buffer: Buffer; contentType: string }[] = [];
    await mammoth.convertToHtml({ buffer: docxFileBuffer }, {
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageBuffer = await image.read();
        images.push({ buffer: imageBuffer, contentType: image.contentType });
        return {};
      }),
    });

    // 6. Create PDF with PDFKit and the selected font
    const pdfDoc = new PDFDocument({ autoFirstPage: false, margins: { top: 72, bottom: 72, left: 72, right: 72 } });
    const pdfChunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => pdfChunks.push(chunk as Buffer));
    pdfDoc.addPage();

    if (customFontLoaded && fontBuffer) {
      pdfDoc.registerFont(fontNameForRegistration, fontBuffer);
      pdfDoc.font(fontNameForRegistration);
      console.log(`Custom font '${fontNameForRegistration}' registered and applied.`);
    } else {
      pdfDoc.font('Helvetica');
      console.log("Proceeding with PDFKit default font 'Helvetica'.");
    }

    pdfDoc.fontSize(12).text(textContent, { lineGap: 4 });

    for (const img of images) {
      pdfDoc.addPage();
      if (customFontLoaded) {
        pdfDoc.font(fontNameForRegistration);
      } else {
        pdfDoc.font('Helvetica');
      }
      try {
        if (img.contentType === 'image/jpeg' || img.contentType === 'image/png') {
          pdfDoc.image(img.buffer, { fit: [pdfDoc.page.width - 144, pdfDoc.page.height - 144], align: 'center', valign: 'center' });
        } else {
          console.warn(`Skipping unsupported image type: ${img.contentType}`);
        }
      } catch (imgError: any) {
        console.error(`Error embedding image:`, imgError);
        pdfDoc.text(`[Error embedding image: ${imgError.message}]`, { align: 'center' });
      }
    }

    return new Promise<ConvertWordToPdfOutput>((resolve, reject) => {
      pdfDoc.on('end', () => {
        const pdfBytes = Buffer.concat(pdfChunks);
        resolve({ pdfDataUri: `data:application/pdf;base64,${pdfBytes.toString('base64')}` });
      });
      pdfDoc.on('error', (err) => reject({ error: "Failed to finalize PDF document. " + err.message }));
      pdfDoc.end();
    });

  } catch (e: any) {
    console.error(`Error converting DOCX ${input.originalFileName}:`, e);
    let errorMessage = "Failed to convert Word document. " + e.message;
    if (e.message?.includes("Unrecognised Office Open XML")) {
        errorMessage = "The uploaded file does not appear to be a valid .docx file or is corrupted.";
    }
    return { error: errorMessage };
  }
}
