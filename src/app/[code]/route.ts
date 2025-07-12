
import { NextResponse, type NextRequest } from 'next/server';
import { userAgent as nextUserAgent } from 'next/server';
import { getLinkByCode, logClick } from '@/lib/url-shortener-db';

// A more reliable function to determine the OS from the user agent string
function getOperatingSystem(request: NextRequest): string {
  const uaString = request.headers.get('user-agent') || '';
  if (/android/i.test(uaString)) {
    return 'Android';
  }
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

  const { desktop, android, ios } = linkData;

  // Prioritized redirection logic using the reliable OS check
  if (osName === 'Android' && android) {
    return NextResponse.redirect(new URL(android));
  } else if (osName === 'iOS' && ios) {
    return NextResponse.redirect(new URL(ios));
  } else if (desktop) {
    // Fallback to desktop URL if it exists
    return NextResponse.redirect(new URL(desktop));
  }

  // If no suitable link is found, redirect to the homepage
  return NextResponse.redirect(new URL('/', request.url));
}
