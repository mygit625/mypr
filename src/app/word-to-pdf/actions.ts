
"use server";

import PDFDocument from 'pdfkit';
import mammoth from 'mammoth';
import type { Buffer } from 'buffer';
import fs from 'fs'; // For reading the font file
import path from 'path'; // For constructing the font file path

interface ConvertWordToPdfInput {
  docxFileBase64: string;
  originalFileName: string;
}

interface ConvertWordToPdfOutput {
  pdfDataUri?: string;
  error?: string;
}

export async function convertWordToPdfAction(input: ConvertWordToPdfInput): Promise<ConvertWordToPdfOutput> {
  if (!input.docxFileBase64) {
    return { error: "No DOCX file data provided for conversion." };
  }

  console.log(`Attempting to convert Word file: ${input.originalFileName} using Mammoth + PDFKit with custom font.`);

  // ---- FONT LOADING ----
  let fontBuffer: Buffer;
  const fontPath = path.join(process.cwd(), 'src', 'assets', 'fonts', 'DejaVuSans.ttf');
  console.log(`Attempting to load font from: ${fontPath}`);

  try {
    fontBuffer = fs.readFileSync(fontPath);
  } catch (fontError: any) {
    console.error(`Error loading font: ${fontPath}`, fontError);
    let userErrorMessage = `Failed to load font for PDF generation (${path.basename(fontPath)}). Please ensure the font file exists at 'src/assets/fonts/${path.basename(fontPath)}'.`;
    if (fontError.code === 'ENOENT') {
        userErrorMessage = `Font file not found at '${fontPath}'. Please ensure 'DejaVuSans.ttf' is placed in the 'src/assets/fonts/' directory.`;
    } else {
        userErrorMessage += ` Original error: ${fontError.message}`;
    }
    return { error: userErrorMessage };
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
        return {}; // Required return for imgElement, but we don't use the element itself
      }),
    };
    // We run convertToHtml mainly for its side effect of calling our image converter
    await mammoth.convertToHtml({ buffer: docxFileBuffer }, imageConvertOptions);

    // 3. Create PDF with PDFKit
    const pdfDoc = new PDFDocument({ autoFirstPage: false, margins: { top: 72, bottom: 72, left: 72, right: 72 } });
    
    const pdfChunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => pdfChunks.push(chunk as Buffer));
    
    pdfDoc.addPage();

    // ---- SET FONT ----
    pdfDoc.font(fontBuffer); // Use the loaded font buffer
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
            // Optionally add placeholder text if font is available and set
            pdfDoc.font(fontBuffer).fontSize(10).text(`[Unsupported image type: ${img.contentType}]`, {align: 'center'});
          }
        } catch (imgError: any) {
          console.error(`Error embedding image in PDFKit for ${input.originalFileName}:`, imgError);
           pdfDoc.font(fontBuffer).fontSize(10).text(`[Error embedding image: ${imgError.message}]`, {align: 'center'});
        }
      }
    }
    
    return new Promise<ConvertWordToPdfOutput>((resolve, reject) => {
      pdfDoc.on('end', () => {
        const pdfBytes = Buffer.concat(pdfChunks);
        const pdfDataUri = `data:application/pdf;base64,${pdfBytes.toString('base64')}`;
        console.log(`PDF conversion with Mammoth + PDFKit (custom font) successful for ${input.originalFileName}.`);
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
