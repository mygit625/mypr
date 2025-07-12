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

      // The redirection logic must be prioritized. Check for mobile OS first.
      if (osName.includes('android') && linkData.android) {
        return NextResponse.redirect(new URL(linkData.android));
      } else if (osName === 'ios' && linkData.ios) {
        // Use a strict check for 'ios' to avoid matching 'mac os'.
        return NextResponse.redirect(new URL(linkData.ios));
      } else if (linkData.desktop) {
        // Fallback to desktop URL for all other cases (including macOS, Windows, Linux).
        return NextResponse.redirect(new URL(linkData.desktop));
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
