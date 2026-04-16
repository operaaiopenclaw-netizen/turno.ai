// src/lib/auth.ts
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            worker: { include: { skills: true } },
            company: true,
          },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workerId: user.worker?.id ?? null,
          companyId: user.company?.id ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.workerId = (user as any).workerId
        token.companyId = (user as any).companyId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        ;(session.user as any).role = token.role
        ;(session.user as any).workerId = token.workerId
        ;(session.user as any).companyId = token.companyId
      }
      return session
    },
  },
})

// Helper: get current session's company ID from a request
export async function getCompanyId(): Promise<string | null> {
  const session = await auth()
  return (session?.user as any)?.companyId ?? null
}

// Helper: get current session's worker ID
export async function getWorkerId(): Promise<string | null> {
  const session = await auth()
  return (session?.user as any)?.workerId ?? null
}

// Helper: require company session (throws if not authenticated)
export async function requireCompany() {
  const session = await auth()
  const companyId = (session?.user as any)?.companyId
  if (!companyId) throw new Error("Unauthorized: company session required")
  return { session, companyId }
}

// Helper: require worker session
export async function requireWorker() {
  const session = await auth()
  const workerId = (session?.user as any)?.workerId
  if (!workerId) throw new Error("Unauthorized: worker session required")
  return { session, workerId }
}
