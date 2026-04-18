// src/app/empresa/analytics/page.tsx
import { auth } from "@/lib/auth"
import { supa } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { formatCurrency } from "@/lib/utils"

export default async function AnalyticsPage() {
  const session   = await auth()
  const companyId = (session?.user as any)?.companyId
  if (!companyId) redirect("/")

  const { data: shifts } = await supa.from("Shift").select("id, status, filledSpots, totalPay, spots, category").eq("companyId", companyId).order("date", { ascending: true })
  const shiftIds = (shifts ?? []).map((s: any) => s.id)

  const [appsRes, paymentsRes, workersRes] = await Promise.all([
    shiftIds.length ? supa.from("Application").select("id, status, workerId").in("shiftId", shiftIds) : { data: [] },
    shiftIds.length ? supa.from("Payment").select("id, status, amount, platformFee").in("shiftId", shiftIds) : { data: [] },
    shiftIds.length
      ? supa.from("Application").select("workerId, Worker(id, rating, totalShifts, User(name), WorkerSkill(skill))").eq("status", "ACCEPTED").in("shiftId", shiftIds)
      : { data: [] },
  ])

  const allShifts  = shifts ?? []
  const payments   = (paymentsRes.data ?? []) as any[]
  const appsRaw    = (workersRes.data ?? []) as any[]

  // Deduplicate workers
  const seen = new Set<string>()
  const workers = appsRaw
    .filter((a: any) => { if (seen.has(a.workerId)) return false; seen.add(a.workerId); return true })
    .map((a: any) => a.Worker).filter(Boolean) as any[]

  const totalPaid    = payments.filter(p => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0)
  const totalPlatFee = payments.filter(p => p.status === "PAID").reduce((s, p) => s + Number(p.platformFee), 0)
  const fillRate     = allShifts.length > 0
    ? Math.round((allShifts.filter((s: any) => s.filledSpots > 0).length / allShifts.length) * 100)
    : 0
  const avgRating = workers.length > 0
    ? (workers.reduce((s: number, w: any) => s + Number(w.rating), 0) / workers.length).toFixed(1)
    : "—"

  const byCat = allShifts.reduce<Record<string, number>>((acc, s: any) => {
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
        <p style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 2 }}>Visão completa da sua operação no Turno</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 32 }}>
        {[
          { value: allShifts.length,           label: "Turnos publicados",     color: "#fff" },
          { value: `${fillRate}%`,              label: "Taxa de preenchimento", color: "var(--primary)" },
          { value: formatCurrency(totalPaid),   label: "Total pago via Pix",   color: "var(--primary)" },
          { value: workers.length,              label: "Trabalhadores únicos",  color: "var(--orange)" },
        ].map(m => (
          <div key={m.label} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: m.color, letterSpacing: -0.5 }}>{m.value}</div>
            <div style={{ fontSize: 11, color: "var(--txt-2)", marginTop: 4 }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 14 }}>Turnos por categoria</div>
          {Object.entries(byCat).map(([cat, count]) => {
            const pct = allShifts.length > 0 ? Math.round((count / allShifts.length) * 100) : 0
            return (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: "var(--txt)" }}>{CAT_LABEL[cat] ?? cat}</span>
                  <span style={{ color: "var(--txt-2)" }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary)", borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
          {Object.keys(byCat).length === 0 && <div style={{ color: "var(--txt-3)", fontSize: 13 }}>Nenhum turno ainda</div>}
        </div>

        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--txt-3)", marginBottom: 14 }}>Resumo financeiro</div>
          {[
            ["Total pago (trabalhadores)", formatCurrency(totalPaid - totalPlatFee)],
            ["Taxa plataforma (18%)", formatCurrency(totalPlatFee)],
            ["Total gasto", formatCurrency(totalPaid)],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "0.5px solid var(--border)", fontSize: 13 }}>
              <span style={{ color: "var(--txt-2)" }}>{label}</span>
              <span style={{ fontWeight: 600, color: "#fff" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--txt-3)" }}>Talent Pool</div>
          <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>{workers.length} pessoas</div>
        </div>
        {workers.length === 0 ? (
          <div style={{ color: "var(--txt-3)", fontSize: 13, padding: "16px 0" }}>Contrate trabalhadores e eles aparecerão aqui automaticamente.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {workers.slice(0, 9).map((w: any) => (
              <div key={w.id} style={{ background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px" }}>
                <div style={{ fontWeight: 600, color: "#fff", fontSize: 13, marginBottom: 2 }}>{w.User?.name}</div>
                <div style={{ fontSize: 11, color: "var(--orange)" }}>{"★".repeat(Math.round(Number(w.rating)))} {Number(w.rating).toFixed(1)}</div>
                <div style={{ fontSize: 11, color: "var(--txt-3)", marginTop: 4 }}>{w.totalShifts} turnos totais</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {(w.WorkerSkill ?? []).slice(0, 2).map((s: any) => (
                    <span key={s.skill} style={{ background: "rgba(0,207,164,0.1)", color: "var(--primary)", border: "0.5px solid rgba(0,207,164,0.25)", borderRadius: 20, padding: "2px 8px", fontSize: 10 }}>{s.skill}</span>
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
