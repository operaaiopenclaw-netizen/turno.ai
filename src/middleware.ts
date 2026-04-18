// middleware.ts — usa auth.config (Edge-compatible, sem bcrypt)
import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (pathname.startsWith("/worker") && pathname !== "/worker/cadastro") {
    if (!session) return NextResponse.redirect(new URL("/", req.url))
    if ((session.user as any)?.role !== "WORKER") return NextResponse.redirect(new URL("/", req.url))
  }

  if (pathname.startsWith("/empresa") && pathname !== "/empresa/cadastro") {
    if (!session) return NextResponse.redirect(new URL("/", req.url))
    if ((session.user as any)?.role !== "COMPANY") return NextResponse.redirect(new URL("/", req.url))
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
