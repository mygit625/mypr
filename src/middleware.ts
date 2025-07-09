import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from './lib/session';
import { getLinkByCode } from './lib/url-shortener-db';

const protectedPaths = ['/admin'];

// List of known pages/paths to exclude from URL shortening logic
const knownPaths = [
  '/',
  '/admin',
  '/login',
  '/api',
  '/_next',
  '/favicon.ico',
  '/pdf-tools',
  '/merge',
  '/split',
  '/compress',
  '/organize',
  '/rotate',
  '/remove-pages',
  '/add-pages',
  '/summarize',
  '/repair',
  '/ocr',
  '/word-to-pdf',
  '/powerpoint-to-pdf',
  '/excel-to-pdf',
  '/jpg-to-pdf',
  '/html-to-pdf',
  '/pdf-to-word',
  '/pdf-to-powerpoint',
  '/pdf-to-jpg',
  '/pdf-to-pdfa',
  '/edit',
  '/add-page-numbers',
  '/watermark',
  '/unit-converters',
  '/qr-code',
  '/url-shortener', // This is the page for creating links
];

// Function to check if a path is a known page or a sub-path of a known page
function isKnownPath(pathname: string): boolean {
  if (pathname.includes('.')) { // Exclude file-like paths (e.g., .png, .css)
    return true;
  }
  return knownPaths.some(known => pathname.startsWith(known) && (pathname.length === known.length || pathname[known.length] === '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Admin Authentication Logic ---
  const isAdminPath = protectedPaths.some(path => pathname.startsWith(path));
  if (isAdminPath) {
    const session = await getIronSession<SessionData>(request.cookies, sessionOptions);
    if (!session.isLoggedIn) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  // --- Dynamic Link Redirection Logic ---
  if (!isKnownPath(pathname)) {
    const code = pathname.substring(1); // Remove leading '/'
    if (code) {
      const links = await getLinkByCode(code);
      if (links) {
        const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
        
        if (userAgent.includes('android') && links.android) {
          return NextResponse.redirect(links.android);
        }
        if ((userAgent.includes('iphone') || userAgent.includes('ipad')) && links.ios) {
          return NextResponse.redirect(links.ios);
        }
        // Fallback to desktop URL or any available URL
        const fallbackUrl = links.desktop || links.android || links.ios;
        if (fallbackUrl) {
          return NextResponse.redirect(fallbackUrl);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match all paths except for static files and API routes.
  // This is a broad matcher; we handle exclusions inside the middleware.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ],
};
