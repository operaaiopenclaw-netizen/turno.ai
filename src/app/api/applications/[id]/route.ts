// src/app/api/applications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { whatsapp } from "@/lib/whatsapp"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const companyId = (session?.user as { companyId?: string })?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { status } = await req.json()
    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    const application = await db.application.findUnique({
      where:   { id: params.id },
      include: {
        shift:  { include: { company: { select: { tradeName: true } } } },
        worker: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    if (!application) return NextResponse.json({ error: "Candidatura não encontrada" }, { status: 404 })
    if (application.shift.companyId !== companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }
    if (application.status !== "PENDING") {
      return NextResponse.json({ error: "Candidatura já decidida" }, { status: 400 })
    }

    if (status === "ACCEPTED") {
      // Usa transação atômica para evitar race condition nos spots
      const result = await db.$transaction(async (tx) => {
        const shift = await tx.shift.findUnique({
          where: { id: application.shiftId },
          select: { spots: true, filledSpots: true, status: true },
        })

        if (!shift || shift.status === "FILLED" || shift.filledSpots >= shift.spots) {
          throw new Error("Vagas esgotadas")
        }

        const updatedApp = await tx.application.update({
          where: { id: params.id },
          data:  { status: "ACCEPTED", decidedAt: new Date() },
        })

        const updatedShift = await tx.shift.update({
          where: { id: application.shiftId },
          data:  { filledSpots: { increment: 1 } },
        })

        if (updatedShift.filledSpots >= updatedShift.spots) {
          await tx.shift.update({
            where: { id: application.shiftId },
            data:  { status: "FILLED" },
          })
        }

        await tx.timesheet.create({
          data: {
            applicationId: params.id,
            shiftId:       application.shiftId,
            workerId:      application.workerId,
            status:        "PENDING",
          },
        })

        await tx.notification.create({
          data: {
            userId: application.worker.user.id,
            type:   "APPLICATION_ACCEPTED",
            title:  "Candidatura aceita! 🎉",
            body:   `Você foi contratado para ${application.shift.role} em ${application.shift.company.tradeName}.`,
            data:   { applicationId: params.id, shiftId: application.shiftId },
          },
        })

        return updatedApp
      })

      // WhatsApp fora da transação — falha não bloqueia o fluxo
      try {
        await whatsapp.notifyAccepted(
          application.worker.phone ?? "",
          application.worker.user.name ?? "Trabalhador",
          application.shift.role,
          application.shift.company.tradeName,
          application.shift.date.toLocaleDateString("pt-BR"),
          application.shift.startTime
        )
      } catch { /* log apenas */ }

      return NextResponse.json({ data: result })
    }

    // Status REJECTED
    const updated = await db.application.update({
      where: { id: params.id },
      data:  { status: "REJECTED", decidedAt: new Date() },
    })

    await db.notification.create({
      data: {
        userId: application.worker.user.id,
        type:   "APPLICATION_REJECTED",
        title:  "Candidatura não aprovada",
        body:   `Sua candidatura para ${application.shift.role} não foi aprovada desta vez.`,
        data:   { applicationId: params.id, shiftId: application.shiftId },
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    const msg = (err as Error).message
    if (msg === "Vagas esgotadas") {
      return NextResponse.json({ error: "Vagas esgotadas para este turno" }, { status: 409 })
    }
    console.error("[PATCH /api/applications/[id]]", err)
    return NextResponse.json({ error: "Erro ao atualizar candidatura" }, { status: 500 })
  }
}
