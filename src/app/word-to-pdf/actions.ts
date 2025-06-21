
"use server";

import PDFDocument from 'pdfkit';
import mammoth from 'mammoth';
import type { Buffer } from 'buffer';
import fs from 'fs';
import path from 'path';

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

  console.log(`Attempting to convert Word file: ${input.originalFileName} using Mammoth (HTML) + PDFKit.`);

  // ---- FONT LOADING ----
  let fontBuffer: Buffer | null = null;
  const fontFileName = 'NotoSansSC-Regular.otf';
  const fontPath = path.join(process.cwd(), 'src', 'assets', 'fonts', fontFileName);
  let customFontLoaded = false;

  try {
    if (fs.existsSync(fontPath)) {
      fontBuffer = fs.readFileSync(fontPath);
      if (fontBuffer.length > 0) {
        customFontLoaded = true;
        console.log(`Successfully loaded font: ${fontFileName}. Size: ${fontBuffer.length} bytes.`);
      } else {
        console.warn(`Font file found at ${fontPath}, but it is empty.`);
      }
    } else {
      console.warn(`Custom font not found at: ${fontPath}. CJK characters will not render correctly. Please add the font file to src/assets/fonts/`);
    }
  } catch (fontError: any) {
    console.error(`Error reading font file: ${fontPath}`, fontError);
  }
  // ---- END FONT LOADING ----

  try {
    const docxFileBuffer = Buffer.from(input.docxFileBase64, 'base64');

    if (docxFileBuffer.length === 0) {
      return { error: "Empty DOCX file data received after base64 decoding." };
    }

    // 1. Convert to HTML, then to plain text to better preserve structure and encoding.
    const htmlResult = await mammoth.convertToHtml({ buffer: docxFileBuffer });
    const html = htmlResult.value;

    const textContent = html
        .replace(/<li[^>]*>/gi, '\n• ') // Handle list items
        .replace(/<\/p>/gi, '\n')     // Handle paragraph endings
        .replace(/<br[^>]*>/gi, '\n')    // Handle line breaks
        .replace(/<[^>]+>/g, '')      // Strip all other tags
        .replace(/&nbsp;/g, ' ')      // Replace non-breaking spaces
        .replace(/&amp;/g, '&')       // Replace ampersands
        .replace(/&lt;/g, '<')        // Replace less-than
        .replace(/&gt;/g, '>')        // Replace greater-than
        .trim();
        
    console.log("Extracted text (first 100 chars):", textContent.substring(0, 100));

    // 2. Extract images
    const images: { buffer: Buffer; contentType: string }[] = [];
    const imageConvertOptions = {
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageBuffer = await image.read();
        images.push({ buffer: imageBuffer, contentType: image.contentType });
        return {};
      }),
    };
    await mammoth.convertToHtml({ buffer: docxFileBuffer }, imageConvertOptions);

    // 3. Create PDF with PDFKit
    const pdfDoc = new PDFDocument({ autoFirstPage: false, margins: { top: 72, bottom: 72, left: 72, right: 72 } });
    
    const pdfChunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => pdfChunks.push(chunk as Buffer));
    
    pdfDoc.addPage();

    // ---- SET FONT ----
    if (customFontLoaded && fontBuffer) {
      // **Explicitly register the font and then use it.** This is more robust.
      pdfDoc.registerFont('NotoSansSC', fontBuffer);
      pdfDoc.font('NotoSansSC');
      console.log(`Custom font '${fontFileName}' registered and applied as 'NotoSansSC'.`);
    } else {
      pdfDoc.font('Helvetica');
      console.log("Proceeding with PDFKit default font 'Helvetica'.");
    }
    // ---- END SET FONT ----

    pdfDoc.fontSize(12).text(textContent, {
      lineGap: 4,
    });

    if (images.length > 0) {
      for (const img of images) {
        pdfDoc.addPage();
        try {
          // Re-apply font for any text on image pages
          if (customFontLoaded) {
             pdfDoc.font('NotoSansSC');
          } else {
             pdfDoc.font('Helvetica');
          }

          if (img.contentType === 'image/jpeg' || img.contentType === 'image/png') {
            pdfDoc.image(img.buffer, {
              fit: [pdfDoc.page.width - 144, pdfDoc.page.height - 144],
              align: 'center',
              valign: 'center',
            });
          } else {
            console.warn(`Skipping image with unsupported content type: ${img.contentType} in file ${input.originalFileName}`);
            pdfDoc.fontSize(10).text(`[Unsupported image type: ${img.contentType}]`, {align: 'center'});
          }
        } catch (imgError: any) {
          console.error(`Error embedding image in PDFKit for ${input.originalFileName}:`, imgError);
           pdfDoc.fontSize(10).text(`[Error embedding image: ${imgError.message}]`, {align: 'center'});
        }
      }
    }
    
    return new Promise<ConvertWordToPdfOutput>((resolve, reject) => {
      pdfDoc.on('end', () => {
        const pdfBytes = Buffer.concat(pdfChunks);
        const pdfDataUri = `data:application/pdf;base64,${pdfBytes.toString('base64')}`;
        console.log(`PDF conversion successful for ${input.originalFileName}.`);
        resolve({ pdfDataUri });
      });

      pdfDoc.on('error', (err) => {
        console.error(`Error during PDFKit stream finalization for ${input.originalFileName}:`, err);
        reject({ error: "Failed to finalize PDF document. " + err.message });
      });
      
      pdfDoc.end();
    });

  } catch (e: any) {
    console.error(`Error converting DOCX ${input.originalFileName}:`, e);
    let errorMessage = "Failed to convert Word document. " + e.message;
    if (e.message && e.message.includes("Unrecognised Office Open XML")) {
        errorMessage = "The uploaded file does not appear to be a valid .docx file or is corrupted.";
    }
    return { error: errorMessage };
  }
}
