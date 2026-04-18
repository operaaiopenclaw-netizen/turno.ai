// src/app/admin/page.tsx
import { auth } from "@/lib/auth"
import { supa } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { AdminPanel } from "./panel"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const session = await auth()
  if ((session?.user as any)?.role !== "ADMIN") redirect("/")

  const [
    { data: companies },
    { data: disputedTimesheets },
    usersRes, workersRes, companiesRes, shiftsRes, paymentsRes, paidPaymentsRes,
  ] = await Promise.all([
    supa.from("Company")
      .select("id, tradeName, legalName, cnpj, industry, neighborhood, verified, createdAt, User(email, name)")
      .order("verified", { ascending: true })
      .order("createdAt", { ascending: false })
      .limit(100),
    supa.from("Timesheet")
      .select("id, createdAt, disputeNote, hoursWorked, Worker(id, User(name, email)), Shift(role, date, totalPay, Company(tradeName))")
      .eq("status", "DISPUTED")
      .order("createdAt", { ascending: false })
      .limit(100),
    supa.from("User").select("*", { count: "exact", head: true }),
    supa.from("Worker").select("*", { count: "exact", head: true }),
    supa.from("Company").select("*", { count: "exact", head: true }),
    supa.from("Shift").select("*", { count: "exact", head: true }),
    supa.from("Payment").select("*", { count: "exact", head: true }),
    supa.from("Payment").select("amount, platformFee").eq("status", "PAID"),
  ])

  const paidPayments   = paidPaymentsRes.data ?? []
  const totalVolume    = paidPayments.reduce((s: number, p: any) => s + Number(p.amount), 0)
  const totalPlatformFee = paidPayments.reduce((s: number, p: any) => s + Number(p.platformFee), 0)

  const metrics = {
    users:         usersRes.count ?? 0,
    workers:       workersRes.count ?? 0,
    companies:     companiesRes.count ?? 0,
    shifts:        shiftsRes.count ?? 0,
    payments:      paymentsRes.count ?? 0,
    totalVolume:   formatCurrency(totalVolume),
    totalPlatform: formatCurrency(totalPlatformFee),
  }

  return (
    <AdminPanel
      companies={(companies ?? []).map((c: any) => ({
        id:           c.id,
        tradeName:    c.tradeName,
        legalName:    c.legalName,
        cnpj:         c.cnpj,
        industry:     c.industry,
        neighborhood: c.neighborhood,
        verified:     c.verified,
        createdAt:    c.createdAt,
        ownerName:    c.User?.name ?? "—",
        ownerEmail:   c.User?.email ?? "—",
      }))}
      disputes={(disputedTimesheets ?? []).map((t: any) => ({
        id:          t.id,
        createdAt:   t.createdAt,
        disputeNote: t.disputeNote,
        hoursWorked: t.hoursWorked,
        workerName:  t.Worker?.User?.name ?? "—",
        workerEmail: t.Worker?.User?.email ?? "—",
        companyName: t.Shift?.Company?.tradeName ?? "—",
        shiftRole:   t.Shift?.role ?? "—",
        shiftDate:   t.Shift?.date ?? "",
        totalPay:    t.Shift?.totalPay ?? 0,
      }))}
      metrics={metrics}
    />
  )
}
