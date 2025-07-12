import { NextResponse, type NextRequest } from 'next/server';
import { userAgent } from 'next/server'; // Import the reliable userAgent utility
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
      // Use the built-in Next.js userAgent parser
      const { os } = userAgent(request);

      if (os.name === 'Android' && linkData.android) {
        return NextResponse.redirect(new URL(linkData.android));
      } else if (os.name === 'iOS' && linkData.ios) {
        return NextResponse.redirect(new URL(linkData.ios));
      } else {
        // Fallback logic: Use desktop, or any other available URL if desktop is not set.
        const fallbackUrl = linkData.desktop || linkData.android || linkData.ios;
        if (fallbackUrl) {
          return NextResponse.redirect(new URL(fallbackUrl));
        }
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
