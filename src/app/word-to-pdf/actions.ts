
"use server";

import PDFDocument from 'pdfkit';
import mammoth from 'mammoth';
import type { Buffer } from 'buffer';

interface ConvertWordToPdfInput {
  docxFileBase64: string; // Changed from Buffer to base64 string
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

  console.log(`Attempting to convert Word file: ${input.originalFileName} using Mammoth + PDFKit`);

  try {
    const docxFileBuffer = Buffer.from(input.docxFileBase64, 'base64'); // Convert base64 back to Buffer

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
        return {}; 
      }),
    };
    await mammoth.convertToHtml({ buffer: docxFileBuffer }, imageConvertOptions);

    // 3. Create PDF with PDFKit
    const pdfDoc = new PDFDocument({ autoFirstPage: false, margins: { top: 72, bottom: 72, left: 72, right: 72 } });
    
    const pdfChunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => pdfChunks.push(chunk as Buffer));
    
    pdfDoc.addPage();
    pdfDoc.font('Helvetica').fontSize(12).text(textContent, {
      align: 'justify',
      lineGap: 4,
    });

    if (images.length > 0) {
      for (const img of images) {
        pdfDoc.addPage();
        try {
          if (img.contentType === 'image/jpeg' || img.contentType === 'image/png') {
            pdfDoc.image(img.buffer, {
              fit: [pdfDoc.page.width - 144, pdfDoc.page.height - 144], 
              align: 'center',
              valign: 'center',
            });
          } else {
            console.warn(`Skipping image with unsupported content type: ${img.contentType}`);
            pdfDoc.text(`[Unsupported image type: ${img.contentType}]`, {align: 'center'});
          }
        } catch (imgError: any) {
          console.error("Error embedding image in PDFKit:", imgError);
          pdfDoc.text(`[Error embedding image: ${imgError.message}]`, {align: 'center'});
        }
      }
    }
    
    return new Promise((resolve, reject) => {
      pdfDoc.on('end', () => {
        const pdfBytes = Buffer.concat(pdfChunks);
        const pdfDataUri = `data:application/pdf;base64,${pdfBytes.toString('base64')}`;
        console.log("PDF conversion with Mammoth + PDFKit successful.");
        resolve({ pdfDataUri });
      });

      pdfDoc.on('error', (err) => {
        console.error("Error during PDFKit stream finalization:", err);
        reject({ error: "Failed to finalize PDF document. " + err.message });
      });
      
      pdfDoc.end();
    });

  } catch (e: any) {
    console.error("Error converting DOCX with Mammoth + PDFKit:", e);
    let errorMessage = "Failed to convert Word document. " + e.message;
    if (e.message && e.message.includes("Unrecognised Office Open XML")) {
        errorMessage = "The uploaded file does not appear to be a valid .docx file or is corrupted.";
    }
    return { error: errorMessage };
  }
}
