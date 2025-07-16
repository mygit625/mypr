import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLink, logClick } from '@/lib/url-shortener-db';
import { detectDevice } from '@/lib/device-detection';

/**
 * Normalizes and validates a URL.
 * If the URL is missing a protocol, it prepends "https://".
 * It then checks if the resulting URL is valid.
 * @param url The URL string to process.
 * @returns A valid, absolute URL string or null if the URL is invalid or empty.
 */
function normalizeAndValidateUrl(url: string | undefined | null): string | null {
    if (!url || url.trim() === '') {
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
        let destinationUrl: string | undefined | null = linkDoc.links.desktop; // Default to desktop

        if (deviceType === 'iOS' && linkDoc.links.ios) {
            destinationUrl = linkDoc.links.ios;
        } else if (deviceType === 'Android' && linkDoc.links.android) {
            destinationUrl = linkDoc.links.android;
        }
        
        // 4. Validate the selected URL and redirect
        const finalUrl = normalizeAndValidateUrl(destinationUrl);

        if (finalUrl) {
            // Perform the redirect using the normalized, absolute URL.
            return NextResponse.redirect(finalUrl);
        } else {
            // If the determined URL (including the desktop fallback) is invalid, go to the homepage.
            console.error(`All URL options for code ${code} are invalid. Redirecting to homepage.`);
            return NextResponse.redirect(baseUrl);
        }

    } catch (error) {
        // This is a last-resort catch block. If anything critical above fails,
        // log the error and redirect to the homepage to avoid a crash.
        console.error(`A critical error occurred while processing short link ${code}:`, error);
        return NextResponse.redirect(baseUrl);
    }
}
