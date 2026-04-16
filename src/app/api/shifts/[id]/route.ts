// src/app/api/shifts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId

    const shift = await db.shift.findUnique({
      where: { id: params.id },
      include: {
        company: { include: { user: { select: { name: true, email: true } } } },
        _count:  { select: { applications: true } },
        ...(workerId ? {
          applications: { where: { workerId }, take: 1 },
        } : {}),
        ...(companyId ? {
          applications: {
            include: {
              worker: {
                include: {
                  user:   { select: { name: true, email: true } },
                  skills: true,
                },
              },
              timesheet: true,
              payment:   true,
            },
          },
        } : {}),
      },
    })

    if (!shift) return NextResponse.json({ error: "Turno não encontrado" }, { status: 404 })

    const data = {
      ...shift,
      userApplication: workerId ? (shift as any).applications?.[0] ?? null : undefined,
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error("[GET /api/shifts/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const shift = await db.shift.findUnique({ where: { id: params.id } })
    if (!shift || shift.companyId !== companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body    = await req.json()
    const updated = await db.shift.update({
      where: { id: params.id },
      data:  body,
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("[PATCH /api/shifts/[id]]", err)
    return NextResponse.json({ error: "Erro ao atualizar turno" }, { status: 500 })
  }
}
