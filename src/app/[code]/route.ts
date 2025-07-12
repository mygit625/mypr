
import { NextResponse, type NextRequest } from 'next/server';
import { userAgent as nextUserAgent } from 'next/server';
import { getLinkByCode, logClick } from '@/lib/url-shortener-db';

// A more reliable function to determine the OS from the user agent string
function getOperatingSystem(request: NextRequest): string {
  const uaString = request.headers.get('user-agent') || '';
  
  if (/android/i.test(uaString)) {
    return 'Android';
  }

  // Use a more specific check for iOS devices to avoid matching 'Mac OS'
  if (/iPad|iPhone|iPod/.test(uaString) && !(global as any).MSStream) {
    return 'iOS';
  }

  // Fallback to Next.js's parser for desktop OS names
  const { os } = nextUserAgent(request);
  return os.name || 'Unknown';
}


export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const osName = getOperatingSystem(request);
  const code = params.code;

  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Asynchronously log the click without waiting for it to complete
  logClick(code, osName).catch(console.error);

  const linkData = await getLinkByCode(code);

  if (!linkData) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Correct, prioritized redirection logic
  if (osName === 'Android' && linkData.android) {
    return NextResponse.redirect(new URL(linkData.android));
  } else if (osName === 'iOS' && linkData.ios) {
    return NextResponse.redirect(new URL(linkData.ios));
  } else if (linkData.desktop) {
    // Fallback to desktop URL if it exists and no mobile-specific match was made
    return NextResponse.redirect(new URL(linkData.desktop));
  }

  // If no suitable link is found for the device, and no desktop fallback exists, redirect to the homepage
  return NextResponse.redirect(new URL('/', request.url));
}
