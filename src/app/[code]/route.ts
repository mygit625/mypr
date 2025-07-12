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

      // Correctly use an if/else if structure to prioritize device links.
      // This ensures that once a condition is met, it redirects immediately.
      if (osName.includes('android') && linkData.android) {
        return NextResponse.redirect(new URL(linkData.android));
      } else if (osName.includes('ios') && linkData.ios) {
        // This includes 'iOS' (for iPhones/iPads) and 'Mac OS' (for desktops)
        // We will assume 'Mac OS' should go to the iOS link if a specific desktop link isn't the primary goal.
        // For more granular control, one could separate 'Mac OS'.
        return NextResponse.redirect(new URL(linkData.ios));
      } else if (linkData.desktop) {
        // This is the final fallback if no mobile-specific URL is matched.
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
