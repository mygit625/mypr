import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from './lib/session';

const protectedPaths = ['/admin'];

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

  // All other requests, including potential short URLs,
  // will now fall through to be handled by pages or the new route handler.
  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - Short links (alphanumeric strings of 7 chars at the root)
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|[a-zA-Z0-9]{7}$).*)'
  ],
};
