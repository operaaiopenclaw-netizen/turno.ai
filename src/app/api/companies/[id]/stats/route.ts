// src/app/api/companies/[id]/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId || companyId !== params.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const [shifts, applications, payments, timesheets] = await Promise.all([
      db.shift.findMany({ where: { companyId } }),
      db.application.findMany({ where: { shift: { companyId } } }),
      db.payment.findMany({ where: { shift: { companyId } } }),
      db.timesheet.findMany({ where: { shift: { companyId } } }),
    ])

    const openShifts      = shifts.filter(s => s.status === "OPEN").length
    const filledShifts    = shifts.filter(s => s.status !== "OPEN" && s.status !== "DRAFT").length
    const fillRate        = shifts.length > 0 ? Math.round((filledShifts / shifts.length) * 100) : 0
    const totalPaid       = payments.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount, 0)
    const pendingApps     = applications.filter(a => a.status === "PENDING").length
    const pendingTS       = timesheets.filter(t => t.status === "PENDING").length
    const avgTimeToFill   = 12 // minutes (mock — in prod: calculate from shift created vs first accepted app)

    return NextResponse.json({
      data: {
        openShifts,
        filledShifts,
        fillRate,
        totalPaid,
        pendingApps,
        pendingTimesheets: pendingTS,
        totalShifts:  shifts.length,
        totalWorkers: new Set(applications.filter(a => a.status === "ACCEPTED").map(a => a.workerId)).size,
        avgTimeToFill,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
