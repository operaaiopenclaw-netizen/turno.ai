// src/app/api/admin/timesheets/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const role    = (session?.user as { role?: string })?.role
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await req.json()
    const action:       "approve" | "reject" | undefined = body?.action
    const resolvedNote: string                           = body?.resolvedNote ?? ""

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }
    if (!resolvedNote.trim()) {
      return NextResponse.json({ error: "Nota de resolução obrigatória" }, { status: 400 })
    }

    const timesheet = await db.timesheet.findUnique({
      where: { id: params.id },
      include: {
        worker: { include: { user: { select: { id: true } } } },
        shift:  { include: { company: { select: { userId: true, tradeName: true } } } },
      },
    })
    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })
    }

    const now = new Date()

    const updated = await db.timesheet.update({
      where: { id: params.id },
      data: action === "approve"
        ? { status: "APPROVED", approvedAt: now, resolvedNote, resolvedAt: now }
        : { status: "PENDING",                   resolvedNote, resolvedAt: now },
    })

    const verdict      = action === "approve" ? "aprovado" : "rejeitado"
    const workerTitle  = action === "approve"
      ? "Disputa resolvida: timesheet aprovado ✓"
      : "Disputa reavaliada: timesheet voltou para revisão"
    const companyTitle = action === "approve"
      ? "Disputa resolvida — timesheet aprovado"
      : "Disputa resolvida — timesheet voltou para revisão"

    await Promise.all([
      db.notification.create({
        data: {
          userId: timesheet.worker.user.id,
          type:   "TIMESHEET_APPROVED",
          title:  workerTitle,
          body:   `A disputa do seu turno em ${timesheet.shift.company.tradeName} foi ${verdict}. Nota da equipe: ${resolvedNote}`,
          data:   { timesheetId: params.id, action },
        },
      }),
      db.notification.create({
        data: {
          userId: timesheet.shift.company.userId,
          type:   "TIMESHEET_APPROVED",
          title:  companyTitle,
          body:   `Nossa equipe resolveu a disputa: ${verdict}. Nota: ${resolvedNote}`,
          data:   { timesheetId: params.id, action },
        },
      }),
    ])

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("[PATCH /api/admin/timesheets/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
