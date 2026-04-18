// src/app/api/timesheet/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

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
  const companyId = (session?.user as any)?.companyId
  const workerId  = (session?.user as any)?.workerId
  if (!companyId && !workerId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { data: timesheet } = await supa
    .from("Timesheet")
    .select("*, Worker(*, User(name, email)), Shift(*, Company(tradeName, companyId)), Payment(*)")
    .eq("id", params.id)
    .single()

  if (!timesheet) return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })

  const shift = (timesheet as any).Shift
  if (companyId && shift?.companyId !== companyId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  if (workerId && timesheet.workerId !== workerId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  return NextResponse.json({ data: timesheet })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId

    const { action, latitude, longitude, note } = await req.json()

    const { data: timesheet } = await supa
      .from("Timesheet")
      .select("*, Shift(id, companyId, role, latitude, longitude, startTime, address, neighborhood, status), Worker(id, phone, User(id, name))")
      .eq("id", params.id)
      .single()

    if (!timesheet) return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })

    const shift      = (timesheet as any).Shift
    const worker     = (timesheet as any).Worker
    const workerUser = worker?.User

    if (action === "checkin") {
      if (timesheet.workerId !== workerId)
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      if (timesheet.checkInAt)
        return NextResponse.json({ error: "Check-in já realizado" }, { status: 400 })

      if (latitude != null && longitude != null && shift?.latitude != null && shift?.longitude != null) {
        const dist = haversineMeters(latitude, longitude, shift.latitude, shift.longitude)
        if (dist > MAX_CHECKIN_DISTANCE_M && process.env.NODE_ENV === "production") {
          return NextResponse.json({
            error: `Você está muito longe do local (${Math.round(dist)}m). Check-in só é permitido a até ${MAX_CHECKIN_DISTANCE_M}m.`,
            distanceMeters: Math.round(dist),
          }, { status: 400 })
        }
      }

      await supa.from("Timesheet").update({
        checkInAt: new Date().toISOString(), checkInLat: latitude ?? null, checkInLng: longitude ?? null,
        updatedAt: new Date().toISOString(),
      }).eq("id", params.id)
      await supa.from("Shift").update({ status: "IN_PROGRESS", updatedAt: new Date().toISOString() }).eq("id", timesheet.shiftId)

      return NextResponse.json({ data: { id: params.id, action: "checkin" } })
    }

    if (action === "checkout") {
      if (timesheet.workerId !== workerId)
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      if (!timesheet.checkInAt)
        return NextResponse.json({ error: "Faça check-in primeiro" }, { status: 400 })
      if (timesheet.checkOutAt)
        return NextResponse.json({ error: "Check-out já realizado" }, { status: 400 })

      const checkOut    = new Date()
      const msWorked    = checkOut.getTime() - new Date(timesheet.checkInAt).getTime()
      const hoursWorked = Math.round((msWorked / 3_600_000) * 100) / 100

      await supa.from("Timesheet").update({
        checkOutAt: checkOut.toISOString(),
        checkOutLat: latitude ?? null, checkOutLng: longitude ?? null,
        hoursWorked, updatedAt: new Date().toISOString(),
      }).eq("id", params.id)

      const { data: remaining } = await supa.from("Timesheet").select("id").eq("shiftId", timesheet.shiftId).is("checkOutAt", null)
      if ((remaining ?? []).length === 0) {
        await supa.from("Shift").update({ status: "COMPLETED", updatedAt: new Date().toISOString() }).eq("id", timesheet.shiftId)
      }

      return NextResponse.json({ data: { id: params.id, action: "checkout", hoursWorked } })
    }

    if (action === "approve") {
      if (shift?.companyId !== companyId)
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
      if (!timesheet.checkOutAt)
        return NextResponse.json({ error: "Worker ainda não fez check-out" }, { status: 400 })

      await supa.from("Timesheet").update({
        status: "APPROVED", approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }).eq("id", params.id)

      if (workerUser?.id) {
        await supa.from("Notification").insert({
          id: crypto.randomUUID(), userId: workerUser.id, type: "TIMESHEET_APPROVED",
          title: "Timesheet aprovado ✓",
          body: "Seu timesheet foi aprovado. Pagamento liberado em breve.",
          data: { timesheetId: params.id }, read: false, createdAt: new Date().toISOString(),
        })
      }

      return NextResponse.json({ data: { id: params.id, action: "approve" } })
    }

    if (action === "dispute") {
      if (shift?.companyId !== companyId)
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

      await supa.from("Timesheet").update({
        status: "DISPUTED", disputeNote: note ?? null, updatedAt: new Date().toISOString(),
      }).eq("id", params.id)

      if (workerUser?.id) {
        await supa.from("Notification").insert({
          id: crypto.randomUUID(), userId: workerUser.id, type: "TIMESHEET_APPROVED",
          title: "Timesheet em disputa ⚠️",
          body: "Sua jornada está em disputa. Nossa equipe vai analisar em até 48h.",
          data: { timesheetId: params.id, note }, read: false, createdAt: new Date().toISOString(),
        })
      }

      return NextResponse.json({ data: { id: params.id, action: "dispute" } })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (err) {
    console.error("[PATCH /api/timesheet/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
