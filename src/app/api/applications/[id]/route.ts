// src/app/api/applications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
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

    const application = await db.application.findUnique({
      where: { id: params.id },
      include: {
        shift:  true,
        worker: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    if (!application) return NextResponse.json({ error: "Candidatura não encontrada" }, { status: 404 })
    if (application.shift.companyId !== companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const updated = await db.application.update({
      where: { id: params.id },
      data:  { status, decidedAt: new Date() },
    })

    // If accepted: increment filledSpots; if now full, close shift
    if (status === "ACCEPTED") {
      const shift = await db.shift.update({
        where: { id: application.shiftId },
        data:  { filledSpots: { increment: 1 } },
      })
      if (shift.filledSpots >= shift.spots) {
        await db.shift.update({
          where: { id: application.shiftId },
          data:  { status: "FILLED" },
        })
      }

      // Create timesheet record
      await db.timesheet.create({
        data: {
          applicationId: params.id,
          shiftId:       application.shiftId,
          workerId:      application.workerId,
          status:        "PENDING",
        },
      })
    }

    // Notify worker
    await db.notification.create({
      data: {
        userId: application.worker.user.id,
        type:   status === "ACCEPTED" ? "APPLICATION_ACCEPTED" : "APPLICATION_REJECTED",
        title:  status === "ACCEPTED" ? "Candidatura aceita! 🎉" : "Candidatura não aprovada",
        body:   status === "ACCEPTED"
          ? `Você foi contratado para ${application.shift.role}. Confirme sua presença.`
          : `Sua candidatura para ${application.shift.role} não foi aprovada desta vez.`,
        data:   { applicationId: params.id, shiftId: application.shiftId },
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("[PATCH /api/applications/[id]]", err)
    return NextResponse.json({ error: "Erro ao atualizar candidatura" }, { status: 500 })
  }
}
