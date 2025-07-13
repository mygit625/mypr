
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
    
    // Log the click event without awaiting to avoid delaying the redirect
    logClick(code, {
      deviceType,
      rawData,
    }).catch(console.error);

    let destinationUrl = linkDoc.links.desktop; // Default

    if (deviceType === 'iOS' && isValidUrl(linkDoc.links.ios)) {
      destinationUrl = linkDoc.links.ios;
    } else if (deviceType === 'Android' && isValidUrl(linkDoc.links.android)) {
      destinationUrl = linkDoc.links.android;
    }

    // After determining the target device URL, check if it's valid.
    // If not, fall back to the desktop URL.
    if (!isValidUrl(destinationUrl)) {
        destinationUrl = linkDoc.links.desktop;
    }

    // Final check: if even the fallback desktop URL is invalid, redirect to the homepage.
    if (!isValidUrl(destinationUrl)) {
      console.warn(`No valid destination URL for code ${code} and device ${deviceType}. Redirecting to homepage.`);
      return NextResponse.redirect(new URL('/', baseUrl));
    }

    return NextResponse.redirect(new URL(destinationUrl));

  } catch (error) {
    console.error(`Error handling shortcode ${code}:`, error);
    // As a final fallback, redirect to the homepage on unexpected errors.
    return NextResponse.redirect(new URL('/', baseUrl));
  }
}
