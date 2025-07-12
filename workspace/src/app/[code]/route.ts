
import { NextResponse, type NextRequest } from 'next/server';
import { getLinkByCode, logClick } from '@/lib/url-shortener-db';
import { getDeviceType } from '@/lib/device-detection';

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

  // Asynchronously log the click with the detected device type
  logClick(code, deviceType).catch(console.error);

  const linkData = await getLinkByCode(code);

  if (!linkData) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Prioritized redirection logic
  if (deviceType === 'Mobile' && linkData.android) {
    return NextResponse.redirect(new URL(linkData.android));
  } else if (deviceType === 'Tablet' && linkData.ios) {
    // Assuming tablets like iPads should go to the iOS link
    return NextResponse.redirect(new URL(linkData.ios));
  } else if (linkData.desktop) {
    // Fallback to desktop URL
    return NextResponse.redirect(new URL(linkData.desktop));
  }

  // If no suitable link is found, redirect to the homepage
  return NextResponse.redirect(new URL('/', request.url));
}
