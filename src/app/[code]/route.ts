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
    const links = await getLinkByCode(code);

    if (links) {
      const userAgent = request.headers.get('user-agent') || '';
      
      // Determine the redirect URL based on the device
      let destinationUrl = links.desktop || '/'; // Fallback to desktop URL or homepage

      if (/android/i.test(userAgent) && links.android) {
        destinationUrl = links.android;
      } else if (/iphone|ipad|ipod/i.test(userAgent) && links.ios) {
        destinationUrl = links.ios;
      }

      // If the determined destination is empty, use the desktop URL as a final fallback.
      if (!destinationUrl && links.desktop) {
        destinationUrl = links.desktop;
      }
      
      // If still no URL, redirect to homepage
      if (!destinationUrl) {
         const homeUrl = new URL('/', request.url);
         return NextResponse.redirect(homeUrl);
      }

      // Perform the redirect
      return NextResponse.redirect(new URL(destinationUrl));
    }
  } catch (error) {
    console.error(`Redirection error for code [${code}]:`, error);
    // Fallback to homepage on any error during lookup.
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  // If the code is not found, redirect to the homepage.
  const notFoundUrl = new URL('/', request.url);
  return NextResponse.redirect(notFoundUrl);
}
