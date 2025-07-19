
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
    
    // Simplified and corrected device detection logic
    let deviceType: 'Android' | 'Desktop' | 'iOS'; 
    const ua = userAgent.toLowerCase();

    if (/android/.test(ua)) {
      deviceType = "Android";
    } else if (/windows/.test(ua)) {
      deviceType = "Desktop";
    } else {
      // Fallback for iOS and all other devices. This matches the client-side redirection logic.
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
        platform: headersList.get('sec-ch-ua-platform')?.replace(/"/g, ''),
        country: headersList.get('cf-ipcountry')
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
