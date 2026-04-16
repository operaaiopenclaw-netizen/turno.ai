// src/app/api/talent-pools/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// GET: list company's talent pool
export async function GET() {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    // Get workers who have completed shifts for this company with high ratings
    const acceptedApps = await db.application.findMany({
      where: {
        status: "ACCEPTED",
        shift:  { companyId },
      },
      distinct: ["workerId"],
      include: {
        worker: {
          include: {
            user:   { select: { name: true, email: true } },
            skills: true,
          },
        },
      },
    })

    const workers = acceptedApps.map(a => a.worker).filter(Boolean)

    return NextResponse.json({ data: workers })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
