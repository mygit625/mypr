
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLink } from '@/lib/url-shortener-db';
import { detectDevice } from '@/lib/device-detection';

// Helper function to check if a URL is valid and absolute.
function isValidUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    // Check if the URL is absolute.
    const newUrl = new URL(url);
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://toolsinn.com';

  try {
    // 1. Fetch link data from Firestore
    const linkDoc = await getLink(code);

    if (!linkDoc) {
      // If the short link code doesn't exist in the database, it's a 404.
      return new NextResponse('Not Found', { status: 404 });
    }

    // This section is temporarily disabled to diagnose the 500 error.
    // The redirect logic below will be used directly.
    /*
    try {
      const deviceType = detectDevice(request.headers);
      const headersObject: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headersObject[key] = value;
      });
      const rawData = {
        headers: headersObject,
        ip: request.ip ?? 'N/A',
        userAgent: request.headers.get('user-agent') || 'Unknown',
      };
      // Non-blocking log. If this fails, the redirect will still happen.
      await logClick(code, { deviceType, rawData });
    } catch (error) {
      console.error(`Failed to log click for code ${code}:`, error);
      // Do not block the redirect if logging fails.
    }
    */

    // 3. Determine the destination URL
    let destinationUrl = '';
    const deviceType = detectDevice(request.headers);

    switch (deviceType) {
      case 'iOS':
        destinationUrl = linkDoc.links.ios || linkDoc.links.desktop;
        break;
      case 'Android':
        destinationUrl = linkDoc.links.android || linkDoc.links.desktop;
        break;
      default: // Desktop or other
        destinationUrl = linkDoc.links.desktop;
    }
    
    // Final fallback to desktop URL if the selected one is empty.
    if (!destinationUrl) {
      destinationUrl = linkDoc.links.desktop;
    }

    // 4. Validate and Redirect
    if (isValidUrl(destinationUrl)) {
      // Perform the redirect using the absolute URL.
      return NextResponse.redirect(destinationUrl);
    } else {
      // If the chosen URL is invalid, fall back to the main site.
      console.warn(`Invalid destination URL for code ${code}: "${destinationUrl}". Redirecting to homepage.`);
      return NextResponse.redirect(baseUrl);
    }

  } catch (error) {
    // This is a last-resort catch block. If anything above fails,
    // log the error and redirect to the homepage to avoid a crash.
    console.error(`A critical error occurred while processing short link ${code}:`, error);
    return NextResponse.redirect(baseUrl);
  }
}
