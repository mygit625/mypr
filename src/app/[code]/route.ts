
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

  try {
    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = await getDeviceType(userAgent);

    const headersObject: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObject[key] = value;
    });
    
    // Ensure geo data is a plain, serializable object for Firestore
    const geoData = request.geo ? {
        city: request.geo.city,
        country: request.geo.country,
        region: request.geo.region,
        latitude: request.geo.latitude,
        longitude: request.geo.longitude,
    } : undefined;

    await logClick(code, { 
      userAgent, 
      deviceType,
      ip: request.ip,
      geo: geoData,
      headers: headersObject,
    });
  } catch (error) {
    // Log the error but don't block the redirect
    console.error(`Failed to log click for code '${code}':`, error);
  }

  const linkData = await getLinkByCode(code);

  if (!linkData) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (linkData.desktop) {
    return NextResponse.redirect(new URL(linkData.desktop));
  }
  
  if (linkData.android) {
    return NextResponse.redirect(new URL(linkData.android));
  }
  
  if (linkData.ios) {
    return NextResponse.redirect(new URL(linkData.ios));
  }

  return NextResponse.redirect(new URL('/', request.url));
}
