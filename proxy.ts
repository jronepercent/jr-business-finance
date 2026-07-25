import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];
const COOKIE_NAME = "pl_session";

async function isAuthenticated(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET!));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const authed = await isAuthenticated(request);

  if (!authed && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (authed && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"],
};
