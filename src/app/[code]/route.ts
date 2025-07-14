import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLink } from '@/lib/url-shortener-db';
import { detectDevice } from '@/lib/device-detection';
// Assuming you have a logClick function similar to this signature
// import { logClick } from '@/lib/analytics';

/**
 * Normalizes and validates a URL.
 * If the URL is missing a protocol, it prepends "https://".
 * It then checks if the resulting URL is valid.
 * @param url The URL string to process.
 * @returns A valid, absolute URL string or null if the URL is invalid or empty.
 */
function normalizeAndValidateUrl(url: string | undefined | null): string | null {
    if (!url) {
        return null; // Return null if the URL is empty, null, or undefined.
    }

    let potentialUrl = url.trim();

    // If the URL doesn't have a protocol, prepend 'https://' as a safe default.
    if (!potentialUrl.startsWith('http://') && !potentialUrl.startsWith('https://')) {
        potentialUrl = `https://${potentialUrl}`;
    }

    try {
        // Verify that the resulting string is a valid URL.
        new URL(potentialUrl);
        return potentialUrl; // Return the valid, absolute URL.
    } catch (e) {
        // If the URL is malformed (e.g., "https//:google.com"), it will fail.
        console.warn(`Invalid URL encountered after normalization: ${url}`);
        return null; // Return null if the URL is fundamentally invalid.
    }
}

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
            return new NextResponse('Not Found', { status: 404 });
        }

        // 2. Log the click event (non-blocking)
        // This runs in the background. If it fails, the redirect will still happen.
        try {
            const deviceType = detectDevice(request.headers);
            const headersObject: Record<string, string> = {};
            request.headers.forEach((value, key) => {
                headersObject[key] = value;
            });
            const rawData = {
                headers: headersObject,
                ip: request.ip ?? 'N/A',
                userAgent: request.headers.get('user-agent') || 'Unknown',
            };
            // Assuming you have a logClick function. If not, you can keep this commented out.
            // await logClick(code, { deviceType, rawData });
        } catch (error) {
            console.error(`Failed to log click for code ${code}:`, error);
            // Do not block the redirect if logging fails.
        }

        // 3. Determine and normalize the destination URL
        const deviceType = detectDevice(request.headers);
        let destinationUrl: string | undefined | null = linkDoc.links.desktop; // Default to desktop

        if (deviceType === 'iOS' && linkDoc.links.ios) {
            destinationUrl = linkDoc.links.ios;
        } else if (deviceType === 'Android' && linkDoc.links.android) {
            destinationUrl = linkDoc.links.android;
        }
        
        // Try to normalize the selected device-specific URL
        let finalUrl = normalizeAndValidateUrl(destinationUrl);

        // 4. If the device-specific URL is invalid, fall back to the desktop URL
        if (!finalUrl) {
            console.warn(`Device-specific URL for code ${code} (device: ${deviceType}) was invalid. Falling back to desktop URL.`);
            finalUrl = normalizeAndValidateUrl(linkDoc.links.desktop);
        }

        // 5. Perform the redirect or fall back to the homepage
        if (finalUrl) {
            // Perform the redirect using the normalized, absolute URL.
            return NextResponse.redirect(finalUrl);
        } else {
            // If all potential URLs (device-specific and desktop) are invalid or empty,
            // log the issue and redirect to the main site as a final fallback.
            console.error(`All URLs for code ${code} are invalid. Redirecting to homepage.`);
            return NextResponse.redirect(baseUrl);
        }

    } catch (error) {
        // This is a last-resort catch block. If anything critical above fails,
        // log the error and redirect to the homepage to avoid a crash.
        console.error(`A critical error occurred while processing short link ${code}:`, error);
        return NextResponse.redirect(baseUrl);
    }
}