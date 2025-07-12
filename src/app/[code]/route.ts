import { NextResponse, type NextRequest } from 'next/server';
import { getLinkByCode } from '@/lib/url-shortener-db';

// This function handles GET requests for any path that isn't a known page.
// e.g., your-app.com/7sT4nFG
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  const homeUrl = new URL('/', request.url);

  if (!code) {
    // If there's no code, redirect to the homepage.
    return NextResponse.redirect(homeUrl);
  }

  try {
    const linkData = await getLinkByCode(code);

    if (linkData) {
      const userAgent = request.headers.get('user-agent') || '';

      // Create a sequential check to ensure the first match is used.
      if (/android/i.test(userAgent) && linkData.android) {
        // First, check for Android and a valid Android URL.
        return NextResponse.redirect(new URL(linkData.android));
      } else if ((/iphone|ipad|ipod/i.test(userAgent)) && linkData.ios) {
        // If not Android, then check for iOS and a valid iOS URL.
        return NextResponse.redirect(new URL(linkData.ios));
      } else if (linkData.desktop) {
        // If neither mobile OS matches, fall back to the desktop URL if it exists.
        return NextResponse.redirect(new URL(linkData.desktop));
      } else {
        // As a final fallback if no desktop URL is set, use any available mobile URL.
        if (linkData.android) return NextResponse.redirect(new URL(linkData.android));
        if (linkData.ios) return NextResponse.redirect(new URL(linkData.ios));
      }
    }
  } catch (error) {
    console.error(`Redirection error for code [${code}]:`, error);
    // Fallback to homepage on any error during lookup.
    return NextResponse.redirect(homeUrl);
  }

  // If the code is not found, or no URLs are defined in the link data, redirect to the homepage.
  return NextResponse.redirect(homeUrl);
}
