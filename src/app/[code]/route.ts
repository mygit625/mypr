
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getLink, logClick } from '@/lib/url-shortener-db';
import { detectDevice } from '@/lib/device-detection';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const headersObject: Record<string, string> = {};
  request.headers.forEach((value, key) => {
      headersObject[key] = value;
  });

  const rawData = {
      headers: headersObject,
      ip: request.ip ?? 'N/A',
      geo: request.geo,
      userAgent: request.headers.get('user-agent') || 'Unknown',
      url: request.url,
      nextUrl: request.nextUrl,
  };

  return NextResponse.json(rawData);
}
