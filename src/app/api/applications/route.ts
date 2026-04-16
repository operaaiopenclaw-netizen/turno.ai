// src/app/api/applications/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// GET: list applications (for company: their shifts' apps; for worker: their own)
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

    const where: Record<string, unknown> = {}
    if (workerId)  where.workerId = workerId
    if (shiftId)   where.shiftId  = shiftId
    if (companyId && !shiftId) {
      // All applications for all shifts of this company
      where.shift = { companyId }
    }

    const applications = await db.application.findMany({
      where,
      include: {
        worker: {
          include: {
            user:   { select: { name: true, email: true, image: true } },
            skills: true,
          },
        },
        shift: {
          include: {
            company: { select: { tradeName: true, neighborhood: true } },
          },
        },
        timesheet: true,
        payment:   true,
      },
      orderBy: { appliedAt: "desc" },
    })

    return NextResponse.json({ data: applications })
  } catch (err) {
    console.error("[GET /api/applications]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST: worker applies to a shift
export async function POST(req: NextRequest) {
  try {
    const session  = await auth()
    const workerId = (session?.user as any)?.workerId
    if (!workerId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { shiftId, message } = await req.json()
    if (!shiftId) return NextResponse.json({ error: "shiftId obrigatório" }, { status: 400 })

    // Check shift exists and is open
    const shift = await db.shift.findUnique({ where: { id: shiftId } })
    if (!shift)              return NextResponse.json({ error: "Turno não encontrado" }, { status: 404 })
    if (shift.status !== "OPEN") return NextResponse.json({ error: "Turno não está aberto" }, { status: 400 })
    if (shift.filledSpots >= shift.spots) {
      return NextResponse.json({ error: "Turno já está completo" }, { status: 400 })
    }

    // Check for duplicate
    const existing = await db.application.findUnique({
      where: { shiftId_workerId: { shiftId, workerId } },
    })
    if (existing) return NextResponse.json({ error: "Já candidatado a este turno" }, { status: 400 })

    const application = await db.application.create({
      data: { shiftId, workerId, message: message ?? null },
      include: {
        shift:  { include: { company: { select: { tradeName: true } } } },
        worker: { include: { user: { select: { name: true } } } },
      },
    })

    // Create notification for company
    const company = await db.company.findUnique({ where: { id: shift.companyId } })
    if (company) {
      await db.notification.create({
        data: {
          userId: company.userId,
          type:   "NEW_APPLICANT",
          title:  "Novo candidato",
          body:   `${application.worker.user.name} se candidatou para ${shift.role}`,
          data:   { shiftId, applicationId: application.id },
        },
      })
    }

    return NextResponse.json({ data: application }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/applications]", err)
    return NextResponse.json({ error: "Erro ao candidatar" }, { status: 500 })
  }
}
