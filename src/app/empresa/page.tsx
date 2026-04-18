// src/app/empresa/page.tsx
import { auth } from "@/lib/auth"
import { supa } from "@/lib/supabase"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

export default async function EmpresaDashboard() {
  const session   = await auth()
  const companyId = (session?.user as any)?.companyId
  if (!companyId) redirect("/")

  const [shiftsRes, timesheetsRes] = await Promise.all([
    supa.from("Shift").select("id, role, date, status, totalPay, filledSpots, spots").eq("companyId", companyId).in("status", ["OPEN", "FILLED", "IN_PROGRESS"]).order("date", { ascending: true }).limit(5),
    supa.from("Timesheet").select("id, status, shiftId, workerId, hoursWorked, Worker(User(name)), Shift(role, totalPay)").eq("status", "PENDING").limit(5),
  ])

  const shifts = shiftsRes.data ?? []
  const timesheets = timesheetsRes.data ?? []
  const amountDue = timesheets.reduce((sum: number, t: any) => sum + Number(t.Shift?.totalPay ?? 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 2 }}>Curitiba · Hoje</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Turnos ativos",     value: shifts.length,            icon: "📋" },
          { label: "Timesheets pendentes", value: timesheets.length,     icon: "⏳" },
          { label: "A pagar",           value: formatCurrency(amountDue), icon: "💰" },
          { label: "Candidaturas",      value: "—",                      icon: "👥" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--card)", borderRadius: 12, padding: "16px 14px" }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--txt-2)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Shifts */}
      {shifts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--txt-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Turnos Abertos</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shifts.map((s: any) => (
              <div key={s.id} style={{ background: "var(--card)", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{s.role}</div>
                  <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>{formatDate(s.date)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{formatCurrency(s.totalPay)}</div>
                  <div style={{ fontSize: 11, color: "var(--txt-2)" }}>{s.filledSpots}/{s.spots} vagas</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timesheets pendentes */}
      {timesheets.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--txt-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Timesheets Pendentes</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {timesheets.map((t: any) => (
              <Link key={t.id} href="/empresa/timesheet" style={{ textDecoration: "none" }}>
                <div style={{ background: "var(--card)", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{t.Worker?.User?.name ?? "Worker"}</div>
                    <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>{t.Shift?.role}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>Aprovar →</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { href: "/empresa/publicar", label: "Publicar turno", icon: "➕" },
          { href: "/empresa/candidatos", label: "Candidatos", icon: "👥" },
          { href: "/empresa/timesheet", label: "Timesheets", icon: "✅" },
          { href: "/empresa/deposito", label: "Depositar", icon: "💳" },
        ].map(a => (
          <Link key={a.href} href={a.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--card)", borderRadius: 12, padding: "18px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 24 }}>{a.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginTop: 6 }}>{a.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
