// src/app/api/companies/[id]/stats/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId || companyId !== params.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { data: shifts } = await supa.from("Shift").select("id, status, filledSpots").eq("companyId", companyId)
    const shiftIds = (shifts ?? []).map((s: any) => s.id)

    const [appsRes, paymentsRes, timesheetsRes] = await Promise.all([
      shiftIds.length ? supa.from("Application").select("id, status, workerId, shiftId").in("shiftId", shiftIds) : { data: [] },
      shiftIds.length ? supa.from("Payment").select("id, status, amount, platformFee, shiftId").in("shiftId", shiftIds) : { data: [] },
      shiftIds.length ? supa.from("Timesheet").select("id, status, shiftId").in("shiftId", shiftIds) : { data: [] },
    ])

    const applications = appsRes.data ?? []
    const payments     = paymentsRes.data ?? []
    const timesheets   = timesheetsRes.data ?? []
    const allShifts    = shifts ?? []

    const openShifts   = allShifts.filter((s: any) => s.status === "OPEN").length
    const filledShifts = allShifts.filter((s: any) => s.status !== "OPEN" && s.status !== "DRAFT").length
    const fillRate     = allShifts.length > 0 ? Math.round((filledShifts / allShifts.length) * 100) : 0
    const totalPaid    = payments.filter((p: any) => p.status === "PAID").reduce((s: number, p: any) => s + Number(p.amount), 0)
    const pendingApps  = applications.filter((a: any) => a.status === "PENDING").length
    const pendingTS    = timesheets.filter((t: any) => t.status === "PENDING").length

    return NextResponse.json({
      data: {
        openShifts, filledShifts, fillRate, totalPaid,
        pendingApps, pendingTimesheets: pendingTS,
        totalShifts: allShifts.length,
        totalWorkers: new Set(applications.filter((a: any) => a.status === "ACCEPTED").map((a: any) => a.workerId)).size,
        avgTimeToFill: 12,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
