// src/app/api/admin/timesheets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const role    = (session?.user as any)?.role
    if (role !== "ADMIN") return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

    const body          = await req.json()
    const action        = body?.action as "approve" | "reject" | undefined
    const resolvedNote  = body?.resolvedNote ?? ""

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }
    if (!resolvedNote.trim()) {
      return NextResponse.json({ error: "Nota de resolução obrigatória" }, { status: 400 })
    }

    const { data: timesheet } = await supa
      .from("Timesheet")
      .select("id, Worker(User(id)), Shift(Company(userId, tradeName))")
      .eq("id", params.id)
      .single()

    if (!timesheet) return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })

    const now           = new Date().toISOString()
    const workerUserId  = (timesheet as any).Worker?.User?.id
    const companyUserId = (timesheet as any).Shift?.Company?.userId
    const companyName   = (timesheet as any).Shift?.Company?.tradeName ?? "empresa"

    await supa.from("Timesheet").update(
      action === "approve"
        ? { status: "APPROVED", approvedAt: now, resolvedNote, resolvedAt: now, updatedAt: now }
        : { status: "PENDING", resolvedNote, resolvedAt: now, updatedAt: now }
    ).eq("id", params.id)

    const verdict = action === "approve" ? "aprovado" : "rejeitado"

    const notifications = []
    if (workerUserId) {
      notifications.push({
        id: crypto.randomUUID(), userId: workerUserId, type: "TIMESHEET_APPROVED",
        title: action === "approve" ? "Disputa resolvida: timesheet aprovado ✓" : "Disputa reavaliada: timesheet voltou para revisão",
        body: `A disputa do seu turno em ${companyName} foi ${verdict}. Nota da equipe: ${resolvedNote}`,
        data: { timesheetId: params.id, action }, read: false, createdAt: now,
      })
    }
    if (companyUserId) {
      notifications.push({
        id: crypto.randomUUID(), userId: companyUserId, type: "TIMESHEET_APPROVED",
        title: action === "approve" ? "Disputa resolvida — timesheet aprovado" : "Disputa resolvida — timesheet voltou para revisão",
        body: `Nossa equipe resolveu a disputa: ${verdict}. Nota: ${resolvedNote}`,
        data: { timesheetId: params.id, action }, read: false, createdAt: now,
      })
    }
    if (notifications.length) await supa.from("Notification").insert(notifications)

    return NextResponse.json({ data: { id: params.id, action } })
  } catch (err) {
    console.error("[PATCH /api/admin/timesheets/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
