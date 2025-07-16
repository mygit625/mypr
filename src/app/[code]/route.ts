
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLink, logClick } from '@/lib/url-shortener-db';

/**
 * A robust device detection function that checks the `sec-ch-ua-platform` header.
 * It positively identifies Android and common Desktop OSes.
 * If the platform is not recognized (which is common for iOS devices), it defaults to 'iOS'.
 * @param headers The request headers.
 * @returns 'iOS', 'Android', or 'Desktop'.
 */
function detectDevice(headers: Headers): 'iOS' | 'Android' | 'Desktop' {
  const platform = headers.get('sec-ch-ua-platform')?.toLowerCase() || '';
  // The header value might be wrapped in quotes, e.g., "Android", "Windows".
  const cleanPlatform = platform.replace(/['"]/g, '');

  if (cleanPlatform.includes('android')) {
    return 'Android';
  }

  if (['windows', 'linux', 'macos'].some(p => cleanPlatform.includes(p))) {
    return 'Desktop';
  }

  // Default to iOS if it's not a recognized Android or Desktop platform.
  return 'iOS';
}

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    const { code } = params;

    try {
        // 1. Fetch link data from Firestore
        const linkDoc = await getLink(code);

        // If the link does not exist, redirect to the error log page.
        if (!linkDoc) {
            const errorParams = new URLSearchParams({
                error: 'Link document not found in database.',
                code: code,
            });
            return NextResponse.redirect(new URL(`/error-log?${errorParams.toString()}`, request.url));
        }

        // 2. Log the click event (non-blocking)
        try {
            await logClick(code, {
                deviceType: detectDevice(request.headers),
                rawData: {
                    headers: Object.fromEntries(request.headers.entries()),
                    ip: request.ip ?? 'N/A',
                    userAgent: request.headers.get('user-agent') || 'Unknown',
                },
            });
        } catch (error) {
            // If logging fails, we still proceed with the redirect.
            console.error(`Failed to log click for code ${code}:`, error);
        }
        
        // 3. Determine the destination URL based on the refined detection logic
        const deviceType = detectDevice(request.headers);
        let destinationUrl = '';

        if (deviceType === 'iOS' && linkDoc.links.ios) {
            destinationUrl = linkDoc.links.ios;
        } else if (deviceType === 'Android' && linkDoc.links.android) {
            destinationUrl = linkDoc.links.android;
        } else { 
            // Fallback to desktop for any other case, including 'Desktop' device type
            // or if the specific device URL is empty.
            destinationUrl = linkDoc.links.desktop || '';
        }
        
        // 4. Redirect if we have a valid destination URL (any non-empty string)
        if (destinationUrl) {
            return NextResponse.redirect(destinationUrl);
        }

        // 5. If no valid URL could be determined, redirect to the error log page with details.
        const errorParams = new URLSearchParams({
            error: 'No valid destination URL could be determined for the detected device.',
            code: code,
            detectedDevice: deviceType,
            attemptedUrl: destinationUrl,
            desktopUrl: linkDoc.links.desktop || 'N/A',
            androidUrl: linkDoc.links.android || 'N/A',
            iosUrl: linkDoc.links.ios || 'N/A',
        });
        return NextResponse.redirect(new URL(`/error-log?${errorParams.toString()}`, request.url));

    } catch (error: any) {
        // This is a last-resort catch block for unexpected server errors.
        console.error(`A critical error occurred while processing short link ${code}:`, error);
        const errorParams = new URLSearchParams({
            error: 'A critical server error occurred.',
            code: code,
            errorMessage: error.message,
            stack: error.stack,
        });
        return NextResponse.redirect(new URL(`/error-log?${errorParams.toString()}`, request.url));
    }
}
