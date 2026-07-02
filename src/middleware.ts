import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.HIL_AUTH_SECRET;

export function middleware(request: NextRequest) {
  // Only guard API routes; pages are protected by the WireGuard tailnet.
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Health endpoint is unauthenticated (monitoring probes).
  if (request.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  // No secret configured → dev mode, allow everything.
  if (!SECRET) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${SECRET}`) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export const config = {
  matcher: "/api/:path*",
};
