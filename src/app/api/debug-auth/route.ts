import { NextResponse } from "next/server"

export async function GET() {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "missing env", SB_URL: !!SB_URL, SB_KEY: !!SB_KEY })
  }

  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/User?email=eq.ana.lima%40gmail.com&select=id,email,role,passwordHash&limit=1`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: "no-store" }
    )
    const data = await r.json()
    const user = data?.[0]
    return NextResponse.json({
      status: r.status,
      found: !!user,
      email: user?.email,
      role: user?.role,
      hasHash: !!user?.passwordHash,
      hashPrefix: user?.passwordHash?.slice(0, 10),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
