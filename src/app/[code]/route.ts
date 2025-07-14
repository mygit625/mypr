
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLink, logClick } from '@/lib/url-shortener-db';
import { detectDevice } from '@/lib/device-detection';

function isValidUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  // 1. Fetch link data from Firestore
  const linkDoc = await getLink(code);

  if (!linkDoc) {
    // If the link doesn't exist, it's a 404
    return new NextResponse('Not Found', { status: 404 });
  }

  // 2. Log the click with device data
  const headersObject: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headersObject[key] = value;
  });

  const rawData = {
    headers: headersObject,
    ip: request.ip ?? 'N/A',
    userAgent: request.headers.get('user-agent') || 'Unknown',
  };
  
  const deviceType = detectDevice(request.headers);
  
  await logClick(code, { deviceType, rawData });

  // 3. Determine the destination URL
  let destinationUrl = '';
  switch (deviceType) {
    case 'iOS':
      destinationUrl = linkDoc.links.ios || linkDoc.links.desktop;
      break;
    case 'Android':
      destinationUrl = linkDoc.links.android || linkDoc.links.desktop;
      break;
    case 'Desktop':
      destinationUrl = linkDoc.links.desktop;
      break;
    default:
      // Fallback for any unknown device types
      destinationUrl = linkDoc.links.desktop;
  }
  
  // Ensure we always have some URL to try, defaulting to desktop
  if (!destinationUrl) {
    destinationUrl = linkDoc.links.desktop;
  }

  // 4. Validate and Redirect
  if (isValidUrl(destinationUrl)) {
    // Perform the redirect using the absolute URL.
    return NextResponse.redirect(destinationUrl);
  } else {
    // If the chosen URL is invalid, fall back to the main site as a last resort.
    // This can happen if a malformed URL was saved in the database.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://toolsinn.com';
    return NextResponse.redirect(baseUrl);
  }
}
