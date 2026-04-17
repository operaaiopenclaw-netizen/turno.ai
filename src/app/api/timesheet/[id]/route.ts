// src/app/api/timesheet/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { whatsapp } from "@/lib/whatsapp"

// Haversine distance em metros entre dois pontos GPS
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R   = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const MAX_CHECKIN_DISTANCE_M = 500

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session   = await auth()
  const companyId = (session?.user as { companyId?: string })?.companyId
  const workerId  = (session?.user as { workerId?: string })?.workerId
  if (!companyId && !workerId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const timesheet = await db.timesheet.findUnique({
    where: { id: params.id },
    include: {
      worker:  { include: { user: { select: { name: true, email: true } } } },
      shift:   { include: { company: { select: { tradeName: true } } } },
      payment: true,
    },
  })
  if (!timesheet) return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })

  if (companyId && timesheet.shift.companyId !== companyId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  if (workerId && timesheet.workerId !== workerId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  return NextResponse.json({ data: timesheet })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as { workerId?: string })?.workerId
    const companyId = (session?.user as { companyId?: string })?.companyId

    const { action, latitude, longitude, note } = await req.json()

    const timesheet = await db.timesheet.findUnique({
      where:   { id: params.id },
      include: {
        shift:  true,
        worker: { include: { user: { select: { id: true, name: true } } } },
      },
    })
    if (!timesheet) return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })

    // ── CHECK IN ──────────────────────────────────────────────────────────────
    if (action === "checkin") {
      if (timesheet.workerId !== workerId)
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      if (timesheet.checkInAt)
        return NextResponse.json({ error: "Check-in já realizado" }, { status: 400 })

      // Validação GPS — só bloqueia em produção; em dev apenas avisa no log.
      if (
        latitude  != null && longitude != null &&
        timesheet.shift.latitude  != null && timesheet.shift.longitude != null
      ) {
        const dist = haversineMeters(
          latitude, longitude,
          timesheet.shift.latitude, timesheet.shift.longitude
        )
        if (dist > MAX_CHECKIN_DISTANCE_M) {
          if (process.env.NODE_ENV === "production") {
            return NextResponse.json({
              error: `Você está muito longe do local (${Math.round(dist)}m). Check-in só é permitido a até ${MAX_CHECKIN_DISTANCE_M}m.`,
              distanceMeters: Math.round(dist),
            }, { status: 400 })
          }
          console.warn(`[checkin DEV] worker ${workerId} está ${Math.round(dist)}m do local — bloqueio ignorado em dev`)
        }
      }

      const updated = await db.timesheet.update({
        where: { id: params.id },
        data:  { checkInAt: new Date(), checkInLat: latitude ?? null, checkInLng: longitude ?? null },
      })
      await db.shift.update({
        where: { id: timesheet.shiftId },
        data:  { status: "IN_PROGRESS" },
      })
      return NextResponse.json({ data: updated })
    }

    // ── CHECK OUT ─────────────────────────────────────────────────────────────
    if (action === "checkout") {
      if (timesheet.workerId !== workerId)
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      if (!timesheet.checkInAt)
        return NextResponse.json({ error: "Faça check-in primeiro" }, { status: 400 })
      if (timesheet.checkOutAt)
        return NextResponse.json({ error: "Check-out já realizado" }, { status: 400 })

      const checkOut    = new Date()
      const msWorked    = checkOut.getTime() - timesheet.checkInAt.getTime()
      const hoursWorked = Math.round((msWorked / 3_600_000) * 100) / 100

      const updated = await db.timesheet.update({
        where: { id: params.id },
        data:  {
          checkOutAt: checkOut,
          checkOutLat: latitude  ?? null,
          checkOutLng: longitude ?? null,
          hoursWorked,
        },
      })

      const remaining = await db.timesheet.count({
        where: { shiftId: timesheet.shiftId, checkOutAt: null },
      })
      if (remaining === 0) {
        await db.shift.update({ where: { id: timesheet.shiftId }, data: { status: "COMPLETED" } })
      }
      return NextResponse.json({ data: updated })
    }

    // ── APPROVE ───────────────────────────────────────────────────────────────
    if (action === "approve") {
      if (timesheet.shift.companyId !== companyId)
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      if (!timesheet.checkOutAt)
        return NextResponse.json({ error: "Worker ainda não fez check-out" }, { status: 400 })

      const updated = await db.timesheet.update({
        where: { id: params.id },
        data:  { status: "APPROVED", approvedAt: new Date() },
      })

      await db.notification.create({
        data: {
          userId: timesheet.worker.user.id,
          type:   "TIMESHEET_APPROVED",
          title:  "Timesheet aprovado ✓",
          body:   `Seu timesheet foi aprovado. Pagamento liberado em breve.`,
          data:   { timesheetId: params.id },
        },
      })

      // WhatsApp checkin reminder for next shift (best-effort)
      try {
        await whatsapp.notifyCheckinReminder(
          timesheet.worker.phone ?? "",
          timesheet.worker.user.name ?? "",
          timesheet.shift.role,
          timesheet.shift.startTime,
          timesheet.shift.address ?? timesheet.shift.neighborhood
        )
      } catch {}

      return NextResponse.json({ data: updated })
    }

    // ── DISPUTE ───────────────────────────────────────────────────────────────
    if (action === "dispute") {
      if (timesheet.shift.companyId !== companyId)
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

      const updated = await db.timesheet.update({
        where: { id: params.id },
        data:  { status: "DISPUTED", disputeNote: note ?? null },
      })

      // Notifica worker sobre disputa
      await db.notification.create({
        data: {
          userId: timesheet.worker.user.id,
          type:   "TIMESHEET_APPROVED",
          title:  "Timesheet em disputa ⚠️",
          body:   `Sua jornada está em disputa. Nossa equipe vai analisar em até 48h.`,
          data:   { timesheetId: params.id, note },
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
