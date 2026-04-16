// middleware.ts — protects /worker and /empresa routes
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Protect worker routes — redirect to login if not authenticated as worker
  if (pathname.startsWith("/worker") && pathname !== "/worker/cadastro") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if ((session.user as any)?.role !== "WORKER") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // Protect empresa routes — redirect to login if not authenticated as company
  if (pathname.startsWith("/empresa") && pathname !== "/empresa/cadastro") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if ((session.user as any)?.role !== "COMPANY") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/worker/:path*",
    "/empresa/:path*",
    "/api/shifts/:path*",
    "/api/applications/:path*",
    "/api/timesheet/:path*",
    "/api/payments/:path*",
    "/api/workers/:path*",
    "/api/companies/:path*",
    "/api/notifications/:path*",
  ],
}
