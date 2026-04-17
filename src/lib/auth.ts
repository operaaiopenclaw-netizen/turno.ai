// src/lib/auth.ts
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function sbGet(path: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    cache: "no-store",
  })
  return r.json()
}

async function findUserByEmail(email: string) {
  const users = await sbGet(`User?email=eq.${encodeURIComponent(email)}&select=id,email,name,role,passwordHash&limit=1`)
  const user = users?.[0]
  if (!user) return null
  const [workers, companies] = await Promise.all([
    sbGet(`Worker?userId=eq.${user.id}&select=id&limit=1`),
    sbGet(`Company?userId=eq.${user.id}&select=id&limit=1`),
  ])
  return { ...user, workerId: workers?.[0]?.id ?? null, companyId: companies?.[0]?.id ?? null }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        const user = await findUserByEmail(credentials.email as string)
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
          workerId: user.workerId,
          companyId: user.companyId,
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
