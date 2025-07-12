
import { NextResponse, type NextRequest } from 'next/server';
import { userAgent } from 'next/server';
import { getLinkByCode, logClick } from '@/lib/url-shortener-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { os } = userAgent(request);
  const osName = os.name || 'Unknown';
  const code = params.code;

  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Asynchronously log the click without waiting for it to complete
  logClick(code, osName).catch(console.error);

  const linkData = await getLinkByCode(code);

  if (!linkData) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const { desktop, android, ios } = linkData;

  // Prioritized redirection logic
  if (osName.toLowerCase().includes('android') && android) {
    return NextResponse.redirect(new URL(android));
  }
  
  // Use a stricter check for 'ios' to avoid matching 'Mac OS'
  if (osName.toLowerCase() === 'ios' && ios) {
    return NextResponse.redirect(new URL(ios));
  }

  // Fallback to desktop URL if it exists, otherwise go to home
  if (desktop) {
    return NextResponse.redirect(new URL(desktop));
  }

  // If no suitable link is found, redirect to the homepage
  return NextResponse.redirect(new URL('/', request.url));
}
