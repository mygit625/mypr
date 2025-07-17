
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

    let deviceType = "Desktop";
    if (/android/i.test(secChUaPlatform || userAgent)) {
        deviceType = "Android";
    } else if (/windows/i.test(secChUaPlatform || userAgent)) {
        deviceType = "Desktop";
    } else if (/iphone|ipad|ipod|macintosh/.test(userAgent)) {
        deviceType = "iOS";
    } else {
        deviceType = "Desktop"; // Default fallback
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
    
    // The real-time increment was failing. It is removed in favor of a manual recount tool.
    // The detailed log is still saved for recount purposes.
    logClick(code, clickData).catch(console.error);

    return NextResponse.json({ success: true }, { status: 202 });

  } catch (error) {
    console.error('[API/log-click] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
