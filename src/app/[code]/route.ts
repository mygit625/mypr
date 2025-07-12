
import { NextResponse, type NextRequest } from 'next/server';
import { userAgent } from 'next/server';
import { getLinkByCode } from '@/lib/url-shortener-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { os } = userAgent(request);
  const osName = os.name || 'Unknown';

  // --- Debugging View ---
  // Instead of redirecting, we now return a simple HTML page
  // that displays the detected operating system.

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Device Detection Debug</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0; 
          background-color: #f0f2f5; 
          color: #1c1e21;
        }
        .container { 
          text-align: center; 
          padding: 40px; 
          border-radius: 12px; 
          background-color: #ffffff; 
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        h1 { 
          font-size: 24px; 
          color: #333; 
          margin-bottom: 8px;
        }
        p { 
          font-size: 36px; 
          font-weight: bold; 
          color: #e53935; /* Primary color from theme */
          margin: 0; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Detected Operating System:</h1>
        <p>${osName}</p>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
