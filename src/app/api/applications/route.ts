// src/app/api/applications/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId
    const { searchParams } = new URL(req.url)
    const shiftId   = searchParams.get("shiftId")

    if (!workerId && !companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    let query = supa
      .from("Application")
      .select("*, Worker(*, User(name, email, image), WorkerSkill(skill)), Shift(*, Company(tradeName, neighborhood)), Timesheet(*), Payment(*)")
      .order("appliedAt", { ascending: false })

    if (workerId)  query = query.eq("workerId", workerId)
    if (shiftId)   query = query.eq("shiftId", shiftId)

    if (companyId && !shiftId && !workerId) {
      const { data: shifts } = await supa.from("Shift").select("id").eq("companyId", companyId)
      const ids = (shifts ?? []).map((s: any) => s.id)
      if (ids.length === 0) return NextResponse.json({ data: [] })
      query = query.in("shiftId", ids)
    }

    const { data: applications } = await query
    return NextResponse.json({ data: applications ?? [] })
  } catch (err) {
    console.error("[GET /api/applications]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session  = await auth()
    const workerId = (session?.user as any)?.workerId
    if (!workerId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { shiftId, message } = await req.json()
    if (!shiftId) return NextResponse.json({ error: "shiftId obrigatório" }, { status: 400 })

    const { data: shift } = await supa.from("Shift").select("id, status, filledSpots, spots, companyId, role").eq("id", shiftId).single()
    if (!shift)                return NextResponse.json({ error: "Turno não encontrado" }, { status: 404 })
    if (shift.status !== "OPEN") return NextResponse.json({ error: "Turno não está aberto" }, { status: 400 })
    if (shift.filledSpots >= shift.spots) return NextResponse.json({ error: "Turno já está completo" }, { status: 400 })

    const { data: existing } = await supa.from("Application").select("id").eq("shiftId", shiftId).eq("workerId", workerId).single()
    if (existing) return NextResponse.json({ error: "Já candidatado a este turno" }, { status: 400 })

    const appId = crypto.randomUUID()
    const { data: application } = await supa.from("Application").insert({
      id: appId, shiftId, workerId, message: message ?? null,
      status: "PENDING", appliedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }).select("*, Worker(User(name)), Shift(role, Company(tradeName, userId))").single()

    const companyUserId = (application as any)?.Shift?.Company?.userId
    const workerName    = (application as any)?.Worker?.User?.name ?? "Trabalhador"
    if (companyUserId) {
      await supa.from("Notification").insert({
        id: crypto.randomUUID(), userId: companyUserId, type: "NEW_APPLICANT",
        title: "Novo candidato", body: `${workerName} se candidatou para ${shift.role}`,
        data: { shiftId, applicationId: appId }, read: false, createdAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ data: application }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/applications]", err)
    return NextResponse.json({ error: "Erro ao candidatar" }, { status: 500 })
  }
}
