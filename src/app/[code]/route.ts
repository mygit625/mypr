
import { NextResponse, type NextRequest } from 'next/server';
import { getLinkByCode, logClick } from '@/lib/multi-direction-links-db';
import { getDeviceType } from '@/lib/device-detection';

export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code;
  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const userAgent = request.headers.get('user-agent') || '';
  const deviceType = await getDeviceType(userAgent);

  // Await the logging of the click to ensure it completes before redirection.
  await logClick(code, { userAgent, deviceType });

  const linkData = await getLinkByCode(code);

  if (!linkData) {
    // If the short code doesn't exist, redirect to the homepage.
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Prioritized redirection logic
  if (deviceType === 'Mobile' && linkData.android) {
    return NextResponse.redirect(new URL(linkData.android));
  }
  
  if ((deviceType === 'Tablet' || deviceType === 'Mobile') && linkData.ios) {
    // Redirect iPhones and iPads to the iOS link
    return NextResponse.redirect(new URL(linkData.ios));
  }

  // Fallback to desktop URL if it exists, or to the first available URL.
  const fallbackUrl = linkData.desktop || linkData.android || linkData.ios;
  if (fallbackUrl) {
    return NextResponse.redirect(new URL(fallbackUrl));
  }

  // If no links are defined at all, redirect to the homepage.
  return NextResponse.redirect(new URL('/', request.url));
}
