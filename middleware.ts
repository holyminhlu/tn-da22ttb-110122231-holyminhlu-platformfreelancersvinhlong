import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const HIDDEN_SOLUTION_PREFIXES = [
  "/enterprise",
  "/agency",
  "/purchase-orders",
  "/agreements",
  "/safepay",
] as const;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const blocked = HIDDEN_SOLUTION_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (blocked) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/enterprise",
    "/enterprise/:path*",
    "/agency",
    "/agency/:path*",
    "/purchase-orders",
    "/purchase-orders/:path*",
    "/agreements",
    "/agreements/:path*",
    "/safepay",
    "/safepay/:path*",
  ],
};
