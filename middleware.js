// Next.js middleware for protecting routes
import { NextResponse } from "next/server"

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Get the session token from cookies
  const sessionToken = request.cookies.get("session")?.value

  // Public routes that don't require authentication
  const publicRoutes = ["/auth/login", "/auth/signup", "/auth/forgot-password"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // If user is not authenticated and trying to access protected route
  if (!sessionToken && !isPublicRoute && pathname !== "/") {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // If user is authenticated and trying to access auth pages
  if (sessionToken && isPublicRoute) {
    return NextResponse.redirect(new URL("/chat", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
}
