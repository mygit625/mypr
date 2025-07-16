
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLink, logClick } from '@/lib/url-shortener-db';
import * as deviceDetection from '@/lib/device-detection';

// Helper function to validate a URL.
function isValidUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    try {
        const newUrl = new URL(url);
        // Check for http or https protocol
        return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
    } catch (e) {
        return false;
    }
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
                deviceType: deviceDetection.detectDevice(request.headers),
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
        
        // 3. Determine the destination URL
        const deviceType = deviceDetection.detectDevice(request.headers);
        let destinationUrl = linkDoc.links.desktop || ''; // Default to desktop URL

        if (deviceType === 'iOS' && linkDoc.links.ios) {
            destinationUrl = linkDoc.links.ios;
        } else if (deviceType === 'Android' && linkDoc.links.android) {
            destinationUrl = linkDoc.links.android;
        }
        
        // 4. Validate the chosen URL and redirect
        if (isValidUrl(destinationUrl)) {
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
