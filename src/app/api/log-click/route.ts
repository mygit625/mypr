
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { logClick } from '@/lib/url-shortener-db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code provided' }, { status: 400 });
    }

    const headersList = headers();
    const userAgent = headersList.get('user-agent') || '';
    const secChUaPlatform = headersList.get('sec-ch-ua-platform')?.replace(/"/g, '');
    const cfIpCountry = headersList.get('cf-ipcountry');

    let deviceType: 'Android' | 'Desktop' | 'iOS'; 
    const ua = userAgent.toLowerCase();
    const platform = secChUaPlatform?.toLowerCase() || '';

    if (/android/.test(platform) || /android/.test(ua)) {
      deviceType = "Android";
    } else if (/windows/.test(platform) || /windows/.test(ua)) {
      deviceType = "Desktop";
    } else {
      // Fallback for iOS and all other non-Android/Windows devices
      deviceType = "iOS";
    }

    const rawHeaders: Record<string, string> = {};
    headersList.forEach((value, key) => {
      rawHeaders[key] = value;
    });

    const clickData = {
      deviceType,
      rawData: {
        headers: rawHeaders,
        ip: headersList.get('x-forwarded-for') ?? undefined,
        userAgent: userAgent,
        platform: secChUaPlatform,
        country: cfIpCountry
      },
    };
    
    // Fire-and-forget the logging process.
    // The redirect should not wait for this to complete.
    logClick(code, clickData).catch(console.error);

    // Respond immediately to the client.
    return NextResponse.json({ success: true }, { status: 202 });

  } catch (error) {
    console.error('[API/log-click] Error processing request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
