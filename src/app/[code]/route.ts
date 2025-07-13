
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLink, logClick } from '@/lib/url-shortener-db';
import { detectDevice } from '@/lib/device-detection';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code;

  // List of known tool paths to avoid treating them as shortcodes
  const knownPaths = [
    'pdf-tools', 'image-tools', 'merge', 'split', 'compress', 'organize',
    'rotate', 'remove-pages', 'add-pages', 'summarize', 'repair', 'ocr',
    'word-to-pdf', 'powerpoint-to-pdf', 'excel-to-pdf', 'jpg-to-pdf',
    'html-to-pdf', 'pdf-to-word', 'pdf-to-powerpoint', 'pdf-to-excel',
    'pdf-to-jpg', 'pdf-to-pdfa', 'edit', 'add-page-numbers', 'watermark',
    'unit-converters', 'qr-code', 'cover-letter-generator', 'circle-crop',
    'remove-background', 'automation-tools', 'url-shortener', 'admin', 'login', 'signup'
  ];

  // If the code is a known page, let Next.js handle it normally.
  if (knownPaths.includes(code)) {
    return NextResponse.next();
  }

  try {
    const linkDoc = await getLink(code);

    if (!linkDoc) {
      // Not a valid shortcode, redirect to a 404 page or homepage
      return NextResponse.redirect(new URL('/404', request.url));
    }
    
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const deviceType = detectDevice(userAgent);
    
    // Log the click event (do not await, to avoid delaying the redirect)
    logClick(code, {
      deviceType,
      userAgent,
      timestamp: Date.now(),
    }).catch(console.error); // Log errors without blocking

    let destinationUrl = linkDoc.links.desktop; // Default/fallback URL

    if (deviceType === 'iOS' && linkDoc.links.ios) {
      destinationUrl = linkDoc.links.ios;
    } else if (deviceType === 'Android' && linkDoc.links.android) {
      destinationUrl = linkDoc.links.android;
    }

    // If no specific URL is found and desktop is also empty, handle gracefully
    if (!destinationUrl) {
      console.warn(`No valid destination URL for code ${code} and device ${deviceType}.`);
      // Redirect to homepage or an error page as a fallback
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.redirect(destinationUrl);

  } catch (error) {
    console.error(`Error handling shortcode ${code}:`, error);
    // Redirect to a generic error page or homepage
    return NextResponse.redirect(new URL('/500', request.url));
  }
}
