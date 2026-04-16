// src/app/api/timesheet/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId
    const { searchParams } = new URL(req.url)
    const status    = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (workerId)  where.workerId = workerId
    if (companyId) where.shift    = { companyId }
    if (status)    where.status   = status

    const timesheets = await db.timesheet.findMany({
      where,
      include: {
        worker: {
          include: {
            user: { select: { name: true, email: true, image: true } },
          },
        },
        shift:   { include: { company: { select: { tradeName: true } } } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: timesheets })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
