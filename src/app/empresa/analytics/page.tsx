// src/app/empresa/analytics/page.tsx
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { formatCurrency } from "@/lib/utils"

export default async function AnalyticsPage() {
  const session   = await auth()
  const companyId = (session?.user as any)?.companyId
  if (!companyId) redirect("/login")

  const [shifts, applications, payments, timesheets, workers] = await Promise.all([
    db.shift.findMany({ where: { companyId }, orderBy: { date: "asc" } }),
    db.application.findMany({ where: { shift: { companyId } } }),
    db.payment.findMany({ where: { shift: { companyId } }, orderBy: { createdAt: "desc" } }),
    db.timesheet.findMany({ where: { shift: { companyId } } }),
    // Unique workers who have worked
    db.worker.findMany({
      where: {
        applications: {
          some: { status: "ACCEPTED", shift: { companyId } },
        },
      },
      include: { user: { select: { name: true } }, skills: true },
    }),
  ])

  const totalPaid      = payments.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount, 0)
  const totalPlatFee   = payments.filter(p => p.status === "PAID").reduce((s, p) => s + p.platformFee, 0)
  const fillRate       = shifts.length > 0
    ? Math.round((shifts.filter(s => s.filledSpots > 0).length / shifts.length) * 100)
    : 0
  const avgRating      = workers.length > 0
    ? (workers.reduce((s, w) => s + w.rating, 0) / workers.length).toFixed(1)
    : "—"

  // Shifts by category
  const byCat = shifts.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + 1
    return acc
  }, {})

  const CAT_LABEL: Record<string, string> = {
    HOSPITALITY: "🍺 Hospitality",
    EVENTS:      "🎪 Eventos",
    RETAIL:      "🏪 Varejo",
    LOGISTICS:   "📦 Logística",
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 2 }}>
          Visão completa da sua operação no Turno
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 32 }}>
        {[
          { value: shifts.length,           label: "Turnos publicados",    color: "#fff" },
          { value: `${fillRate}%`,           label: "Taxa de preenchimento", color: "var(--primary)" },
          { value: formatCurrency(totalPaid),label: "Total pago via Pix",   color: "var(--primary)" },
          { value: workers.length,           label: "Trabalhadores únicos",  color: "var(--orange)" },
        ].map(m => (
          <div key={m.label} style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            borderRadius: 12,
            padding: "20px 16px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: m.color, letterSpacing: -0.5 }}>{m.value}</div>
            <div style={{ fontSize: 11, color: "var(--txt-2)", marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Turnos por categoria */}
        <div style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
          borderRadius: 12,
          padding: "18px",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 14 }}>
            Turnos por categoria
          </div>
          {Object.entries(byCat).map(([cat, count]) => {
            const pct = shifts.length > 0 ? Math.round((count / shifts.length) * 100) : 0
            return (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: "var(--txt)" }}>{CAT_LABEL[cat] ?? cat}</span>
                  <span style={{ color: "var(--txt-2)" }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary)", borderRadius: 3, transition: "width .5s" }} />
                </div>
              </div>
            )
          })}
          {Object.keys(byCat).length === 0 && (
            <div style={{ color: "var(--txt-3)", fontSize: 13 }}>Nenhum turno ainda</div>
          )}
        </div>

        {/* Financeiro */}
        <div style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
          borderRadius: 12,
          padding: "18px",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 14 }}>
            Resumo financeiro
          </div>
          {[
            ["Total pago (trabalhadores)", formatCurrency(totalPaid - totalPlatFee)],
            ["Taxa plataforma (18%)",       formatCurrency(totalPlatFee)],
            ["Total gasto",                 formatCurrency(totalPaid)],
            ["Pagamentos pendentes",        formatCurrency(
              shifts
                .filter(s => !payments.find(p => p.shiftId === s.id && p.status === "PAID"))
                .reduce((sum, s) => sum + s.totalPay * s.filledSpots, 0)
            )],
          ].map(([label, value]) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 0",
              borderBottom: "0.5px solid var(--border)",
              fontSize: 13,
            }}>
              <span style={{ color: "var(--txt-2)" }}>{label}</span>
              <span style={{ fontWeight: 600, color: "#fff" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pool de trabalhadores */}
      <div style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        borderRadius: 12,
        padding: "18px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--txt-3)" }}>
            Talent Pool — trabalhadores que já trabalharam com vocês
          </div>
          <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>{workers.length} pessoas</div>
        </div>
        {workers.length === 0 ? (
          <div style={{ color: "var(--txt-3)", fontSize: 13, padding: "16px 0" }}>
            Contrate trabalhadores e eles aparecerão aqui automaticamente.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {workers.slice(0, 9).map(w => (
              <div key={w.id} style={{
                background: "var(--surface-2)",
                border: "0.5px solid var(--border)",
                borderRadius: 10,
                padding: "12px",
              }}>
                <div style={{ fontWeight: 600, color: "#fff", fontSize: 13, marginBottom: 2 }}>
                  {w.user.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--orange)" }}>
                  {"★".repeat(Math.round(w.rating))} {w.rating.toFixed(1)}
                </div>
                <div style={{ fontSize: 11, color: "var(--txt-3)", marginTop: 4 }}>
                  {w.totalShifts} turnos totais
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {w.skills.slice(0, 2).map(s => (
                    <span key={s.id} style={{
                      background: "rgba(0,207,164,0.1)",
                      color: "var(--primary)",
                      border: "0.5px solid rgba(0,207,164,0.25)",
                      borderRadius: 20,
                      padding: "2px 8px",
                      fontSize: 10,
                    }}>{s.skill}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
