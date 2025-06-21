
"use server";

import PDFDocument from 'pdfkit';
import mammoth from 'mammoth';
import type { Buffer } from 'buffer';
import fs from 'fs'; // For reading the font file
import path from 'path'; // For constructing the font file path

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

  console.log(`Attempting to convert Word file: ${input.originalFileName} using Mammoth + PDFKit with custom font.`);

  // ---- FONT LOADING ----
  // Using Noto Sans Simplified Chinese for broad CJK language support.
  // The user MUST place this font file in the specified directory.
  let fontBuffer: Buffer | null = null;
  const fontFileName = 'NotoSansSC-Regular.otf'; // Switched to Noto Sans SC for CJK support
  const fontPath = path.join(process.cwd(), 'src', 'assets', 'fonts', fontFileName);
  let customFontLoaded = false;

  try {
    if (fs.existsSync(fontPath)) {
      fontBuffer = fs.readFileSync(fontPath);
      customFontLoaded = true;
      console.log(`Successfully loaded font: ${fontPath}`);
    } else {
      console.warn(`Custom font not found at: ${fontPath}. Will use default PDFKit font. CJK and other special characters may not render correctly.`);
      // Proceed with PDFKit's default font (Helvetica) if Noto font is not found.
    }
  } catch (fontError: any) {
    console.error(`Error reading font file: ${fontPath}`, fontError);
    // Proceeding without custom font, but log the attempt error.
  }
  // ---- END FONT LOADING ----


  try {
    const docxFileBuffer = Buffer.from(input.docxFileBase64, 'base64');

    if (docxFileBuffer.length === 0) {
      return { error: "Empty DOCX file data received after base64 decoding." };
    }

    // 1. Extract raw text
    const rawTextResult = await mammoth.extractRawText({ buffer: docxFileBuffer });
    const textContent = rawTextResult.value;

    // 2. Extract images
    const images: { buffer: Buffer; contentType: string }[] = [];
    const imageConvertOptions = {
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageBuffer = await image.read();
        images.push({ buffer: imageBuffer, contentType: image.contentType });
        return {}; // Required return for imgElement
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
      pdfDoc.font(fontBuffer);
      console.log(`Custom font ${fontFileName} applied to PDF.`);
    } else {
      // pdfkit will use its default (Helvetica)
      console.log("Proceeding with PDFKit default font.");
    }
    // ---- END SET FONT ----

    pdfDoc.fontSize(12).text(textContent, {
      align: 'justify',
      lineGap: 4,
    });

    if (images.length > 0) {
      for (const img of images) {
        pdfDoc.addPage();
        try {
          if (img.contentType === 'image/jpeg' || img.contentType === 'image/png') {
            pdfDoc.image(img.buffer, {
              fit: [pdfDoc.page.width - 144, pdfDoc.page.height - 144], // Fit within margins
              align: 'center',
              valign: 'center',
            });
          } else {
            console.warn(`Skipping image with unsupported content type: ${img.contentType} in file ${input.originalFileName}`);
            if (customFontLoaded && fontBuffer) pdfDoc.font(fontBuffer); // Ensure font is set for placeholder
            else pdfDoc.font('Helvetica'); // Fallback if custom font not loaded
            pdfDoc.fontSize(10).text(`[Unsupported image type: ${img.contentType}]`, {align: 'center'});
          }
        } catch (imgError: any) {
          console.error(`Error embedding image in PDFKit for ${input.originalFileName}:`, imgError);
           if (customFontLoaded && fontBuffer) pdfDoc.font(fontBuffer);
           else pdfDoc.font('Helvetica');
           pdfDoc.fontSize(10).text(`[Error embedding image: ${imgError.message}]`, {align: 'center'});
        }
      }
    }
    
    return new Promise<ConvertWordToPdfOutput>((resolve, reject) => {
      pdfDoc.on('end', () => {
        const pdfBytes = Buffer.concat(pdfChunks);
        const pdfDataUri = `data:application/pdf;base64,${pdfBytes.toString('base64')}`;
        console.log(`PDF conversion with Mammoth + PDFKit (font: ${customFontLoaded ? fontFileName : 'default'}) successful for ${input.originalFileName}.`);
        resolve({ pdfDataUri });
      });

      pdfDoc.on('error', (err) => {
        console.error(`Error during PDFKit stream finalization for ${input.originalFileName}:`, err);
        reject({ error: "Failed to finalize PDF document. " + err.message });
      });
      
      pdfDoc.end();
    });

  } catch (e: any) {
    console.error(`Error converting DOCX ${input.originalFileName} with Mammoth + PDFKit:`, e);
    let errorMessage = "Failed to convert Word document. " + e.message;
    if (e.message && e.message.includes("Unrecognised Office Open XML")) {
        errorMessage = "The uploaded file does not appear to be a valid .docx file or is corrupted.";
    }
    return { error: errorMessage };
  }
}
