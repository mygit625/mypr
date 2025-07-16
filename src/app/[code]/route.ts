
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLink, logClick } from '@/lib/url-shortener-db';
import { detectDevice } from '@/lib/device-detection';

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    const { code } = params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://toolsinn.com';

    try {
        // 1. Fetch link data from Firestore
        const linkDoc = await getLink(code);

        if (!linkDoc) {
            // If the short link code doesn't exist, it's a 404.
            // Redirecting to homepage as a safe fallback.
            return NextResponse.redirect(baseUrl);
        }

        // 2. Log the click event (non-blocking). If it fails, redirect still happens.
        try {
            const headersObject: Record<string, string> = {};
            request.headers.forEach((value, key) => {
                headersObject[key] = value;
            });
            await logClick(code, {
                deviceType: detectDevice(request.headers),
                rawData: {
                    headers: headersObject,
                    ip: request.ip ?? 'N/A',
                    userAgent: request.headers.get('user-agent') || 'Unknown',
                },
            });
        } catch (error) {
            console.error(`Failed to log click for code ${code}:`, error);
        }
        
        // 3. Determine the destination URL with a clear fallback mechanism
        const deviceType = detectDevice(request.headers);
        let destinationUrl = linkDoc.links.desktop; // Default to desktop

        if (deviceType === 'iOS' && linkDoc.links.ios) {
            destinationUrl = linkDoc.links.ios;
        } else if (deviceType === 'Android' && linkDoc.links.android) {
            destinationUrl = linkDoc.links.android;
        }
        
        // 4. Validate the selected URL and redirect
        // Ensure the destination is a valid, non-empty string.
        if (typeof destinationUrl === 'string' && destinationUrl.trim() !== '') {
            // Prepend https:// if no protocol is present.
            const finalUrl = destinationUrl.startsWith('http') ? destinationUrl : `https://${destinationUrl}`;
            return NextResponse.redirect(finalUrl);
        }

        // 5. If no valid URL could be determined, redirect to homepage.
        return NextResponse.redirect(baseUrl);

    } catch (error) {
        // This is a last-resort catch block. If anything critical above fails,
        // log the error and redirect to the homepage to avoid a crash.
        console.error(`A critical error occurred while processing short link ${code}:`, error);
        return NextResponse.redirect(baseUrl);
    }
}
