// src/app/admin/page.tsx
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

export default async function AdminPage() {
  const session = await auth()
  if ((session?.user as any)?.role !== "ADMIN") redirect("/")

  const [
    users, workers, companies, shifts,
    applications, payments, timesheets,
  ] = await Promise.all([
    db.user.count(),
    db.worker.count(),
    db.company.count(),
    db.shift.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { company: { select: { tradeName: true } } } }),
    db.application.count(),
    db.payment.findMany({ where: { status: "PAID" } }),
    db.timesheet.count(),
  ])

  const totalPlatRevenue = payments.reduce((s, p) => s + p.platformFee, 0)
  const totalVolume      = payments.reduce((s, p) => s + p.amount, 0)

  const stats = [
    { label: "Usuários totais",       value: users,              color: "#fff" },
    { label: "Trabalhadores",         value: workers,            color: "var(--primary)" },
    { label: "Empresas",              value: companies,          color: "var(--orange)" },
    { label: "Turnos publicados",     value: shifts.length,      color: "#fff" },
    { label: "Candidaturas",          value: applications,       color: "var(--purple)" },
    { label: "Timesheets",            value: timesheets,         color: "#fff" },
    { label: "Volume total (Pix)",    value: formatCurrency(totalVolume),     color: "var(--primary)" },
    { label: "Receita plataforma",    value: formatCurrency(totalPlatRevenue), color: "var(--primary)" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
            Turno<span style={{ color: "var(--primary)" }}>.</span> Admin
          </div>
          <div style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 4 }}>
            Visão geral da plataforma · Curitiba Beta
          </div>
        </div>

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              borderRadius: 12, padding: "18px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: -0.5, marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--txt-2)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent shifts */}
        <div style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
          borderRadius: 12, padding: "20px",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 16 }}>
            Últimos turnos publicados
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Empresa", "Função", "Data", "Pagamento", "Vagas", "Status"].map(h => (
                  <th key={h} style={{
                    textAlign: "left", padding: "8px 10px",
                    borderBottom: "0.5px solid var(--border)",
                    fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--txt-3)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.id} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px", color: "var(--txt)" }}>{s.company.tradeName}</td>
                  <td style={{ padding: "10px", color: "var(--txt)" }}>{s.role}</td>
                  <td style={{ padding: "10px", color: "var(--txt-2)" }}>
                    {new Date(s.date).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={{ padding: "10px", color: "var(--primary)", fontWeight: 600 }}>
                    {formatCurrency(s.totalPay)}
                  </td>
                  <td style={{ padding: "10px", color: "var(--txt-2)" }}>{s.spots}</td>
                  <td style={{ padding: "10px" }}>
                    <span style={{
                      background: s.status === "OPEN" ? "var(--primary-dim)" : "rgba(255,255,255,0.06)",
                      color: s.status === "OPEN" ? "var(--primary)" : "var(--txt-2)",
                      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500,
                    }}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent payments */}
        <div style={{
          background: "var(--purple-dim)",
          border: "0.5px solid rgba(124,131,253,0.2)",
          borderRadius: 12, padding: "16px 20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                {payments.length} pagamentos Pix realizados
              </div>
              <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>
                Volume: {formatCurrency(totalVolume)} · Receita: {formatCurrency(totalPlatRevenue)}
              </div>
            </div>
            <span style={{ fontSize: 22 }}>⛓</span>
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: "var(--txt-3)", textAlign: "center" }}>
          <Link href="/" style={{ color: "var(--primary)" }}>← Voltar ao início</Link>
        </div>
      </div>
    </div>
  )
}
