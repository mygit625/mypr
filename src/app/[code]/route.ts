import { NextResponse, type NextRequest } from 'next/server';
import { getLinkByCode } from '@/lib/url-shortener-db';

// This function handles GET requests for any path that isn't a known page.
// e.g., your-app.com/7sT4nFG
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  if (!code) {
    // If there's no code, redirect to the homepage.
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  try {
    const linkData = await getLinkByCode(code);

    if (linkData) {
      const userAgent = request.headers.get('user-agent') || '';

      // Prioritize mobile URLs if they exist and match the user agent
      if (/android/i.test(userAgent) && linkData.android) {
        return NextResponse.redirect(new URL(linkData.android));
      }
      if ((/iphone|ipad|ipod/i.test(userAgent)) && linkData.ios) {
        return NextResponse.redirect(new URL(linkData.ios));
      }
      
      // Fallback to desktop URL if it exists
      if (linkData.desktop) {
        return NextResponse.redirect(new URL(linkData.desktop));
      }
      
      // As a final fallback, if only a mobile URL exists, use the first available one
      if (linkData.android) return NextResponse.redirect(new URL(linkData.android));
      if (linkData.ios) return NextResponse.redirect(new URL(linkData.ios));

    }
  } catch (error) {
    console.error(`Redirection error for code [${code}]:`, error);
    // Fallback to homepage on any error during lookup.
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  // If the code is not found, or no URLs are defined in the link data, redirect to the homepage.
  const notFoundUrl = new URL('/', request.url);
  return NextResponse.redirect(notFoundUrl);
}
