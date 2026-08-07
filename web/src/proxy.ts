import { NextResponse, type NextRequest } from 'next/server';

const AUTH_PAGES = new Set(['/login', '/register']);

/**
 * Route gating on cookie presence only — actual token verification happens on
 * the Express backend for every proxied request. This just keeps
 * unauthenticated browsers out of protected pages (and authed ones off the
 * login/register pages).
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has('token');

  if (AUTH_PAGES.has(pathname)) {
    if (hasToken) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!hasToken) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
