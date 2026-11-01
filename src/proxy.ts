import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * A convenience, not the guard: send people without a session cookie straight
 * to the login page. It only checks that a cookie exists. Every admin page and
 * action still validates the session on the server (requireAdmin()).
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (!getSessionCookie(request)) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
