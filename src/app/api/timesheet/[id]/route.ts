// src/app/api/timesheet/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    const workerId  = (session?.user as any)?.workerId
    if (!companyId && !workerId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const timesheet = await db.timesheet.findUnique({
      where: { id: params.id },
      include: {
        worker: { include: { user: { select: { name: true, email: true } } } },
        shift:  { include: { company: { select: { tradeName: true } } } },
        payment: true,
      },
    })
    if (!timesheet) return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })

    // Auth check: only company owner or the worker
    if (companyId && timesheet.shift.companyId !== companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }
    if (workerId && timesheet.workerId !== workerId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    return NextResponse.json({ data: timesheet })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId

    const { action, latitude, longitude, note } = await req.json()

    const timesheet = await db.timesheet.findUnique({
      where: { id: params.id },
      include: {
        shift:  true,
        worker: { include: { user: { select: { id: true } } } },
      },
    })

    if (!timesheet) return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })

    // ── CHECK IN (worker) ───────────────────────────────────────────────────
    if (action === "checkin") {
      if (timesheet.workerId !== workerId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      }
      const updated = await db.timesheet.update({
        where: { id: params.id },
        data: {
          checkInAt:  new Date(),
          checkInLat:  latitude  ?? null,
          checkInLng:  longitude ?? null,
        },
      })
      // Move shift to IN_PROGRESS on first check-in
      await db.shift.update({
        where: { id: timesheet.shiftId },
        data:  { status: "IN_PROGRESS" },
      })
      return NextResponse.json({ data: updated })
    }

    // ── CHECK OUT (worker) ──────────────────────────────────────────────────
    if (action === "checkout") {
      if (timesheet.workerId !== workerId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      }
      if (!timesheet.checkInAt) {
        return NextResponse.json({ error: "Faça check-in primeiro" }, { status: 400 })
      }
      const checkOut    = new Date()
      const msWorked    = checkOut.getTime() - timesheet.checkInAt.getTime()
      const hoursWorked = Math.round((msWorked / 3600000) * 100) / 100

      const updated = await db.timesheet.update({
        where: { id: params.id },
        data: {
          checkOutAt:  checkOut,
          checkOutLat: latitude    ?? null,
          checkOutLng: longitude   ?? null,
          hoursWorked,
        },
      })

      // If all workers checked out → shift COMPLETED
      const openTimesheets = await db.timesheet.count({
        where: { shiftId: timesheet.shiftId, checkOutAt: null },
      })
      if (openTimesheets === 0) {
        await db.shift.update({
          where: { id: timesheet.shiftId },
          data:  { status: "COMPLETED" },
        })
      }
      return NextResponse.json({ data: updated })
    }

    // ── APPROVE (company) ───────────────────────────────────────────────────
    if (action === "approve") {
      if (timesheet.shift.companyId !== companyId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      }

      const updated = await db.timesheet.update({
        where: { id: params.id },
        data: {
          status:     "APPROVED",
          approvedAt: new Date(),
        },
      })

      // Notify worker
      await db.notification.create({
        data: {
          userId: timesheet.worker.user.id,
          type:   "TIMESHEET_APPROVED",
          title:  "Timesheet aprovado ✓",
          body:   `Seu timesheet foi aprovado. Pagamento em processamento.`,
          data:   { timesheetId: params.id },
        },
      })

      return NextResponse.json({ data: updated })
    }

    // ── DISPUTE (company) ───────────────────────────────────────────────────
    if (action === "dispute") {
      if (timesheet.shift.companyId !== companyId) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      }
      const updated = await db.timesheet.update({
        where: { id: params.id },
        data: {
          status:      "DISPUTED",
          disputeNote: note ?? null,
        },
      })
      return NextResponse.json({ data: updated })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (err) {
    console.error("[PATCH /api/timesheet/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
