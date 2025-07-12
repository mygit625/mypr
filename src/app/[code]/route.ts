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

      // Check for Android first
      if (osName.includes('android') && linkData.android) {
        return NextResponse.redirect(new URL(linkData.android));
      }

      // Then check for iOS
      if (osName.includes('ios') && linkData.ios) {
        return NextResponse.redirect(new URL(linkData.ios));
      }

      // Fallback to desktop if available
      if (linkData.desktop) {
        return NextResponse.redirect(new URL(linkData.desktop));
      }
    }
  } catch (error) {
    console.error(`Redirection error for code [${code}]:`, error);
    return NextResponse.redirect(homeUrl);
  }

  // If code is not found or no valid URLs are present, redirect to home
  return NextResponse.redirect(homeUrl);
}
