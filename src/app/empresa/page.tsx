// src/app/empresa/page.tsx
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"

export default async function EmpresaDashboard() {
  const session   = await auth()
  const companyId = (session?.user as any)?.companyId
  if (!companyId) redirect("/login")

  const [shifts, timesheets] = await Promise.all([
    db.shift.findMany({
      where:   { companyId, status: { in: ["OPEN", "FILLED"] } },
      include: { _count: { select: { applications: true } } },
      orderBy: { date: "asc" },
      take:    5,
    }),
    db.timesheet.findMany({
      where:   { shift: { companyId }, status: "PENDING" },
      include: {
        worker: { include: { user: { select: { name: true } } } },
        shift:  { select: { role: true } },
      },
      take: 3,
    }),
  ])

  const totalApplicants = shifts.reduce((sum, s) => sum + s._count.applications, 0)
  const amountDue       = timesheets.reduce((sum, t) => {
    const s = shifts.find(x => x.id === t.shiftId)
    return sum + (s?.totalPay ?? 0)
  }, 0)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 2 }}>Curitiba · Hoje</p>
      </div>

      {/* Metrics */}
      <div className="metrics-grid" style={{ marginBottom: 32 }}>
        {[
          { value: shifts.length,             label: "Turnos ativos",             color: "var(--primary)" },
          { value: totalApplicants,            label: "Total de candidatos",       color: "#fff" },
          { value: timesheets.length,          label: "Timesheets pendentes",      color: "var(--orange)" },
          { value: formatCurrency(amountDue),  label: "A pagar (aprovados)",       color: "var(--primary)" },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
            <div className="metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Pending timesheets alert */}
      {timesheets.length > 0 && (
        <div style={{
          background: "var(--orange-dim)",
          border: "0.5px solid rgba(255,159,67,0.3)",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⏱</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
              {timesheets.length} timesheet{timesheets.length > 1 ? "s" : ""} aguardando aprovação
            </div>
            <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>
              Aprove para liberar o pagamento via Pix
            </div>
          </div>
          <Link href="/empresa/timesheet">
            <button style={{
              padding: "7px 16px",
              background: "var(--orange)",
              border: "none",
              borderRadius: 8,
              color: "#1a0800",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}>
              Aprovar →
            </button>
          </Link>
        </div>
      )}

      {/* Active shifts */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="label">Turnos publicados</div>
          <Link href="/empresa/publicar" style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
            + Novo turno
          </Link>
        </div>

        {shifts.length === 0 ? (
          <div style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            borderRadius: 12,
            padding: "32px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, color: "var(--txt-2)" }}>Nenhum turno publicado ainda</div>
            <Link href="/empresa/publicar">
              <button style={{
                marginTop: 16,
                padding: "10px 24px",
                background: "var(--primary)",
                border: "none",
                borderRadius: 9,
                color: "#001a12",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
              }}>
                Publicar primeiro turno
              </button>
            </Link>
          </div>
        ) : (
          shifts.map(s => (
            <div key={s.id} style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>
                  {s.role}
                  <span style={{ fontSize: 12, color: "var(--txt-2)", fontWeight: 400, marginLeft: 8 }}>
                    · {formatDate(s.date)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--txt-3)", marginTop: 3 }}>
                  {s._count.applications} candidatos · {s.spots - s.filledSpots} vaga{s.spots - s.filledSpots !== 1 ? "s" : ""} restante{s.spots - s.filledSpots !== 1 ? "s" : ""} · {s.startTime}–{s.endTime}
                </div>
              </div>
              <Link href="/empresa/candidatos">
                <button style={{
                  padding: "6px 14px",
                  background: "transparent",
                  border: "0.5px solid var(--border-2)",
                  borderRadius: 8,
                  color: "var(--txt-2)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  Ver →
                </button>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Fill rate */}
      <div style={{
        background: "var(--purple-dim)",
        border: "0.5px solid rgba(124,131,253,0.25)",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}>
        <span style={{ fontSize: 28 }}>📈</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Taxa de preenchimento</div>
          <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>
            Curitiba · Hospitality & Eventos · Beta
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>
          95%
        </div>
      </div>
    </div>
  )
}
