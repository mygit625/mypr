
"use server";

import PDFDocument from 'pdfkit';
import mammoth from 'mammoth';
import type { Buffer } from 'buffer';

interface ConvertWordToPdfInput {
  docxFileBuffer: Buffer; // Expecting a Buffer directly
  originalFileName: string;
}

interface ConvertWordToPdfOutput {
  pdfDataUri?: string;
  error?: string;
}

export async function convertWordToPdfAction(input: ConvertWordToPdfInput): Promise<ConvertWordToPdfOutput> {
  if (!input.docxFileBuffer || input.docxFileBuffer.length === 0) {
    return { error: "No DOCX file data provided for conversion." };
  }

  console.log(`Attempting to convert Word file: ${input.originalFileName} using Mammoth + PDFKit`);

  try {
    // 1. Extract raw text
    const rawTextResult = await mammoth.extractRawText({ buffer: input.docxFileBuffer });
    const textContent = rawTextResult.value;

    // 2. Extract images
    // We'll store image buffers and their content types
    const images: { buffer: Buffer; contentType: string }[] = [];
    const imageConvertOptions = {
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageBuffer = await image.read();
        images.push({ buffer: imageBuffer, contentType: image.contentType });
        // For HTML conversion, you might return a placeholder, but we don't need HTML for this approach.
        // We are primarily using this to populate the `images` array.
        return {}; // Return an empty object as we are not constructing HTML here.
      }),
    };
    // Run convertToHtml primarily to trigger the image extraction via convertImage
    await mammoth.convertToHtml({ buffer: input.docxFileBuffer }, imageConvertOptions);

    // 3. Create PDF with PDFKit
    const pdfDoc = new PDFDocument({ autoFirstPage: false, margins: { top: 72, bottom: 72, left: 72, right: 72 } });
    
    const pdfChunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => pdfChunks.push(chunk as Buffer));
    
    // Add a first page
    pdfDoc.addPage();

    // Add extracted text
    pdfDoc.font('Helvetica').fontSize(12).text(textContent, {
      align: 'justify',
      lineGap: 4,
    });

    // Add extracted images, each on a new page for simplicity or scaled
    if (images.length > 0) {
      for (const img of images) {
        pdfDoc.addPage();
        try {
          // Attempt to embed the image. PDFKit supports JPG and PNG.
          // Mammoth usually gives 'image/png' or 'image/jpeg'.
          if (img.contentType === 'image/jpeg' || img.contentType === 'image/png') {
            pdfDoc.image(img.buffer, {
              fit: [pdfDoc.page.width - 144, pdfDoc.page.height - 144], // fit within margins
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
