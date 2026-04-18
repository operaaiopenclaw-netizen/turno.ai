// src/app/api/applications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { status } = await req.json()
    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    const { data: application } = await supa
      .from("Application")
      .select("id, shiftId, workerId, status, Shift(id, companyId, role, filledSpots, spots, date, startTime, Company(tradeName, userId)), Worker(id, phone, User(id, name))")
      .eq("id", params.id)
      .single()

    if (!application) return NextResponse.json({ error: "Candidatura não encontrada" }, { status: 404 })

    const shift     = (application as any).Shift
    const worker    = (application as any).Worker
    const workerUser = worker?.User

    if (shift?.companyId !== companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    if (application.status !== "PENDING") return NextResponse.json({ error: "Candidatura já decidida" }, { status: 400 })

    if (status === "ACCEPTED") {
      if (!shift || shift.status === "FILLED" || shift.filledSpots >= shift.spots) {
        return NextResponse.json({ error: "Vagas esgotadas para este turno" }, { status: 409 })
      }

      await supa.from("Application").update({ status: "ACCEPTED", decidedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).eq("id", params.id)

      const newFilledSpots = shift.filledSpots + 1
      await supa.from("Shift").update({
        filledSpots: newFilledSpots,
        ...(newFilledSpots >= shift.spots ? { status: "FILLED" } : {}),
        updatedAt: new Date().toISOString(),
      }).eq("id", application.shiftId)

      await supa.from("Timesheet").insert({
        id: crypto.randomUUID(), applicationId: params.id, shiftId: application.shiftId,
        workerId: application.workerId, status: "PENDING", updatedAt: new Date().toISOString(),
      })

      if (workerUser?.id) {
        await supa.from("Notification").insert({
          id: crypto.randomUUID(), userId: workerUser.id, type: "APPLICATION_ACCEPTED",
          title: "Candidatura aceita! 🎉",
          body: `Você foi contratado para ${shift.role} em ${shift.Company?.tradeName ?? "empresa"}.`,
          data: { applicationId: params.id, shiftId: application.shiftId },
          read: false, createdAt: new Date().toISOString(),
        })
      }

      return NextResponse.json({ data: { id: params.id, status: "ACCEPTED" } })
    }

    // REJECTED
    await supa.from("Application").update({ status: "REJECTED", decidedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).eq("id", params.id)

    if (workerUser?.id) {
      await supa.from("Notification").insert({
        id: crypto.randomUUID(), userId: workerUser.id, type: "APPLICATION_REJECTED",
        title: "Candidatura não aprovada",
        body: `Sua candidatura para ${shift?.role ?? "turno"} não foi aprovada desta vez.`,
        data: { applicationId: params.id, shiftId: application.shiftId },
        read: false, createdAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ data: { id: params.id, status: "REJECTED" } })
  } catch (err) {
    console.error("[PATCH /api/applications/[id]]", err)
    return NextResponse.json({ error: "Erro ao atualizar candidatura" }, { status: 500 })
  }
}
