
import { NextResponse, type NextRequest } from 'next/server';
import { userAgent } from 'next/server';
import { getLinkByCode } from '@/lib/url-shortener-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  const homeUrl = new URL('/', request.url);

  if (!code) {
    return NextResponse.redirect(homeUrl);
  }

  try {
    const linkData = await getLinkByCode(code);

    if (linkData) {
      const { os } = userAgent(request);
      const osName = os.name?.toLowerCase() || '';

      // Prioritize Android if an Android link exists and the device is Android.
      if (linkData.android && osName.includes('android')) {
        return NextResponse.redirect(new URL(linkData.android));
      }
      
      // Prioritize iOS if an iOS link exists and the device is iOS (strict check).
      if (linkData.ios && osName === 'ios') {
        return NextResponse.redirect(new URL(linkData.ios));
      }

      // Fallback to desktop link if it exists. This will now correctly handle
      // macOS, Windows, Linux, or mobile devices where no specific link was provided.
      if (linkData.desktop) {
        return NextResponse.redirect(new URL(linkData.desktop));
      }

      // If there's no desktop link but there are other links, redirect to the first available one as a last resort.
      const fallbackUrl = linkData.android || linkData.ios;
      if (fallbackUrl) {
          return NextResponse.redirect(new URL(fallbackUrl));
      }
    }
  } catch (error) {
    console.error(`Redirection error for code [${code}]:`, error);
    // Fallback to home on any error during processing.
    return NextResponse.redirect(homeUrl);
  }

  // If code is not found or no valid URLs are present in linkData, redirect to home.
  return NextResponse.redirect(homeUrl);
}
