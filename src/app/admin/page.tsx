// src/app/admin/page.tsx
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { AdminPanel } from "./panel"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "ADMIN") redirect("/")

  const [
    companies, disputedTimesheets,
    usersCount, workersCount, companiesCount, shiftsCount, paymentsCount, paidPayments,
  ] = await Promise.all([
    db.company.findMany({
      orderBy: [{ verified: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true, tradeName: true, legalName: true, cnpj: true,
        industry: true, neighborhood: true, verified: true, createdAt: true,
        user: { select: { email: true, name: true } },
      },
    }),
    db.timesheet.findMany({
      where: { status: "DISPUTED" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, createdAt: true, disputeNote: true, hoursWorked: true,
        worker: { select: { id: true, user: { select: { name: true, email: true } } } },
        shift:  { select: { role: true, date: true, totalPay: true, company: { select: { tradeName: true } } } },
      },
    }),
    db.user.count(),
    db.worker.count(),
    db.company.count(),
    db.shift.count(),
    db.payment.count(),
    db.payment.findMany({ where: { status: "PAID" }, select: { amount: true, platformFee: true } }),
  ])

  const totalVolume    = paidPayments.reduce((s, p) => s + p.amount, 0)
  const totalPlatformFee = paidPayments.reduce((s, p) => s + p.platformFee, 0)

  const metrics = {
    users:          usersCount,
    workers:        workersCount,
    companies:      companiesCount,
    shifts:         shiftsCount,
    payments:       paymentsCount,
    totalVolume:    formatCurrency(totalVolume),
    totalPlatform:  formatCurrency(totalPlatformFee),
  }

  return (
    <AdminPanel
      companies={companies.map(c => ({
        id:           c.id,
        tradeName:    c.tradeName,
        legalName:    c.legalName,
        cnpj:         c.cnpj,
        industry:     c.industry,
        neighborhood: c.neighborhood,
        verified:     c.verified,
        createdAt:    c.createdAt.toISOString(),
        ownerName:    c.user.name ?? "—",
        ownerEmail:   c.user.email,
      }))}
      disputes={disputedTimesheets.map(t => ({
        id:          t.id,
        createdAt:   t.createdAt.toISOString(),
        disputeNote: t.disputeNote,
        hoursWorked: t.hoursWorked,
        workerName:  t.worker.user.name ?? "—",
        workerEmail: t.worker.user.email,
        companyName: t.shift.company.tradeName,
        shiftRole:   t.shift.role,
        shiftDate:   t.shift.date.toISOString(),
        totalPay:    t.shift.totalPay,
      }))}
      metrics={metrics}
    />
  )
}
