
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLink, logClick } from '@/lib/url-shortener-db';
import { detectDevice } from '@/lib/device-detection';

function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://toolsinn.com';

  const knownPaths = [
    'pdf-tools', 'image-tools', 'merge', 'split', 'compress', 'organize',
    'rotate', 'remove-pages', 'add-pages', 'summarize', 'repair', 'ocr',
    'word-to-pdf', 'powerpoint-to-pdf', 'excel-to-pdf', 'jpg-to-pdf',
    'html-to-pdf', 'pdf-to-word', 'pdf-to-powerpoint', 'pdf-to-excel',
    'pdf-to-jpg', 'pdf-to-pdfa', 'edit', 'add-page-numbers', 'watermark',
    'unit-converters', 'qr-code', 'cover-letter-generator', 'circle-crop',
    'remove-background', 'automation-tools', 'smart-url-shortener', 'admin', 'login', 'signup'
  ];

  if (knownPaths.includes(code)) {
    return NextResponse.next();
  }

  try {
    const linkDoc = await getLink(code);

    if (!linkDoc) {
      return NextResponse.redirect(new URL('/404', baseUrl));
    }
    
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const deviceType = detectDevice(userAgent);
    
    const headersObject: Record<string, string> = {};
    request.headers.forEach((value, key) => {
        headersObject[key] = value;
    });

    const rawData = {
        headers: headersObject,
        ip: request.ip ?? 'N/A',
        userAgent: userAgent,
    };
    
    logClick(code, {
      deviceType,
      rawData,
    }).catch(console.error);

    // --- Corrected Logic ---
    let destinationUrl = '';

    // 1. Select the URL based on device priority
    if (deviceType === 'iOS' && linkDoc.links.ios) {
      destinationUrl = linkDoc.links.ios;
    } else if (deviceType === 'Android' && linkDoc.links.android) {
      destinationUrl = linkDoc.links.android;
    } else {
      // 2. Unconditionally fall back to desktop if no device-specific URL is found
      destinationUrl = linkDoc.links.desktop;
    }

    // 3. Perform a single validation check on the chosen URL
    if (isValidUrl(destinationUrl)) {
      return NextResponse.redirect(destinationUrl);
    }

    // 4. If the chosen URL (even the desktop fallback) is invalid, go to homepage.
    console.warn(`No valid destination URL for code ${code}. Final attempted URL was '${destinationUrl}'. Redirecting to homepage.`);
    return NextResponse.redirect(new URL('/', baseUrl));

  } catch (error) {
    console.error(`Error handling shortcode ${code}:`, error);
    return NextResponse.redirect(new URL('/', baseUrl));
  }
}
