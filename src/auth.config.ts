// auth.config.ts — Edge-compatible (sem bcrypt, sem Node.js APIs)
import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/", error: "/" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role      = (user as any).role
        token.workerId  = (user as any).workerId
        token.companyId = (user as any).companyId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        ;(session.user as any).role      = token.role
        ;(session.user as any).workerId  = token.workerId
        ;(session.user as any).companyId = token.companyId
      }
      return session
    },
  },
}
