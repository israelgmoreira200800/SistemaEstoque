import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/platform/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/platform")) {
    const cookieName = process.env.PLATFORM_SESSION_COOKIE_NAME ?? "vertice_platform_session";
    if (!request.cookies.has(cookieName)) {
      return NextResponse.redirect(new URL("/platform/login", request.url));
    }
    return NextResponse.next();
  }

  const cookieName = process.env.SESSION_COOKIE_NAME ?? "estoque_session";

  if (pathname.startsWith("/dashboard") && !request.cookies.has(cookieName)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/platform/:path*"],
};
