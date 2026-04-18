// src/app/api/talent-pools/route.ts
import { NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { data: shifts } = await supa.from("Shift").select("id").eq("companyId", companyId)
    const shiftIds = (shifts ?? []).map((s: any) => s.id)

    if (shiftIds.length === 0) return NextResponse.json({ data: [] })

    const { data: apps } = await supa
      .from("Application")
      .select("workerId, Worker(*, User(name, email), WorkerSkill(skill))")
      .eq("status", "ACCEPTED")
      .in("shiftId", shiftIds)

    // Deduplicate by workerId
    const seen = new Set<string>()
    const workers = (apps ?? [])
      .filter((a: any) => { if (seen.has(a.workerId)) return false; seen.add(a.workerId); return true })
      .map((a: any) => a.Worker)
      .filter(Boolean)

    return NextResponse.json({ data: workers })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
