// src/app/api/timesheet/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId
    const { searchParams } = new URL(req.url)
    const status    = searchParams.get("status")

    let query = supa
      .from("Timesheet")
      .select("*, Worker(*, User(name, email, image)), Shift(*, Company(tradeName)), Payment(*)")
      .order("createdAt", { ascending: false })

    if (workerId)  query = query.eq("workerId", workerId)
    if (status)    query = query.eq("status", status)

    if (companyId && !workerId) {
      const { data: shifts } = await supa.from("Shift").select("id").eq("companyId", companyId)
      const ids = (shifts ?? []).map((s: any) => s.id)
      if (ids.length === 0) return NextResponse.json({ data: [] })
      query = query.in("shiftId", ids)
    }

    const { data: timesheets } = await query
    return NextResponse.json({ data: timesheets ?? [] })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
