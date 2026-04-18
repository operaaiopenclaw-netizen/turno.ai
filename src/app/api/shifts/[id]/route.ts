// src/app/api/shifts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId

    const { data: shift } = await supa
      .from("Shift")
      .select("*, Company(id, tradeName, neighborhood, rating, User(name, email))")
      .eq("id", params.id)
      .single()

    if (!shift) return NextResponse.json({ error: "Turno não encontrado" }, { status: 404 })

    let userApplication = null
    let applications: any[] = []

    if (workerId) {
      const { data } = await supa.from("Application").select("id, status, shiftId, workerId").eq("shiftId", params.id).eq("workerId", workerId)
      userApplication = (data ?? [])[0] ?? null
    }

    if (companyId) {
      const { data } = await supa
        .from("Application")
        .select("*, Worker(*, User(name, email), WorkerSkill(skill)), Timesheet(*), Payment(*)")
        .eq("shiftId", params.id)
      applications = data ?? []
    }

    const { count } = await supa.from("Application").select("*", { count: "exact", head: true }).eq("shiftId", params.id)

    return NextResponse.json({ data: { ...shift, userApplication, applications, _count: { applications: count ?? 0 } } })
  } catch (err) {
    console.error("[GET /api/shifts/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { data: shift } = await supa.from("Shift").select("id, companyId").eq("id", params.id).single()
    if (!shift || shift.companyId !== companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await req.json()
    const { data: updated } = await supa.from("Shift").update({ ...body, updatedAt: new Date().toISOString() }).eq("id", params.id).select().single()

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("[PATCH /api/shifts/[id]]", err)
    return NextResponse.json({ error: "Erro ao atualizar turno" }, { status: 500 })
  }
}
