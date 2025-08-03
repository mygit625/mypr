
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Correct SVG path for the specific Merge PDF icon used on the site
    const mergeIconPath = `
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path d="M14 2v6h6" />
      <path d="M12 18v-6" />
      <path d="M9 15h6" />
    `;

    // Box Icon Path (for logo)
    const boxIconPath = `
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    `;

    const svg = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <style>
          .bg { fill: #FFFFFF; } /* White background for better contrast */
          .title { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 82px; font-weight: bold; fill: #1A202C; text-anchor: middle; }
          .url { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 44px; fill: #4A5568; text-anchor: middle; }
          .logo-text { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 48px; font-weight: bold; fill: #e53935; } /* Red color for logo text */
          .icon { stroke: #e53935; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; } /* Red color for icons */
        </style>
        
        <rect width="1200" height="630" class="bg" />

        <!-- Main Tool Icon (Corrected Merge Icon) -->
        <g transform="translate(550, 120) scale(5)">
          <g class="icon">
            ${mergeIconPath}
          </g>
        </g>
        
        <text x="600" y="380" class="title">Merge PDF</text>
        
        <text x="600" y="440" class="url">Toolsinn.com</text>
        
        <!-- Logo at the bottom center -->
        <g transform="translate(480, 550)">
          <!-- Box Icon for Logo -->
          <svg width="60" height="60" viewBox="0 0 24 24" class="icon" stroke-width="2">
            ${boxIconPath}
          </svg>
          <text x="70" y="45" class="logo-text">Toolsinn</text>
        </g>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e: any) {
    console.error('Failed to generate OG image', e);
    return new NextResponse('Failed to generate OG image', { status: 500 });
  }
}
