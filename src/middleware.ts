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
  '/pdf-to-excel',
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
    // This part is commented out for now to simplify and focus on the Firestore issue.
    // You can re-enable it once the main issue is solved.
    // const session = await getIronSession<SessionData>(request.cookies, sessionOptions);
    // if (!session.isLoggedIn) {
    //   return NextResponse.redirect(new URL('/admin/login', request.url));
    // }
    return NextResponse.next();
  }

  // The middleware will no longer handle dynamic link redirection to avoid "client offline" errors.
  // This logic is now handled by a dedicated page.

  return NextResponse.next();
}

export const config = {
  // Match all paths except for static files and API routes.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ],
};
