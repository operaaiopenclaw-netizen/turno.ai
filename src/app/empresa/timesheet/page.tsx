"use client"
// src/app/empresa/timesheet/page.tsx
import { useState, useEffect } from "react"
import { Timesheet } from "@/types"
import { Avatar, Stars, Card, Divider, Spinner, EmptyState, InfoRow } from "@/components/ui"
import { Button } from "@/components/ui/Button"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { useRouter } from "next/navigation"

export default function TimesheetPage() {
  const router  = useRouter()
  const [sheets,   setSheets]   = useState<Timesheet[]>([])
  const [loading,  setLoading]  = useState(true)
  const [acting,   setActing]   = useState<string | null>(null)
  const [toast,    setToast]    = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res  = await fetch("/api/timesheet")
      const json = await res.json()
      setSheets(json.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function approve(timesheetId: string) {
    setActing(timesheetId)
    const res = await fetch(`/api/timesheet/${timesheetId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "approve" }),
    })
    if (res.ok) {
      setSheets(prev => prev.map(t =>
        t.id === timesheetId ? { ...t, status: "APPROVED" } : t
      ))
      setToast("Timesheet aprovado! Iniciando pagamento...")
      setTimeout(() => {
        router.push(`/empresa/pagamento?timesheetId=${timesheetId}`)
      }, 1200)
    } else {
      setToast("Erro ao aprovar timesheet")
    }
    setActing(null)
  }

  async function dispute(timesheetId: string) {
    const note = prompt("Descreva o problema com o timesheet:")
    if (!note) return
    setActing(timesheetId)
    await fetch(`/api/timesheet/${timesheetId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "dispute", note }),
    })
    setSheets(prev => prev.map(t =>
      t.id === timesheetId ? { ...t, status: "DISPUTED" } : t
    ))
    setToast("Disputa registrada. Nossa equipe analisará.")
    setActing(null)
  }

  const pending  = sheets.filter(t => t.status === "PENDING")
  const approved = sheets.filter(t => t.status === "APPROVED")
  const disputed = sheets.filter(t => t.status === "DISPUTED")

  function TimesheetCard({ t }: { t: Timesheet }) {
    const nm   = t.worker?.user?.name ?? "Trabalhador"
    const role = t.shift?.role ?? "Turno"
    const open = expanded === t.id

    const workedH     = t.hoursWorked ?? 0
    const shiftPay    = t.shift ? 0 : 0 // We don't have totalPay directly on timesheet
    const checkInFmt  = t.checkInAt  ? formatDateTime(t.checkInAt)  : "—"
    const checkOutFmt = t.checkOutAt ? formatDateTime(t.checkOutAt) : "—"

    return (
      <Card key={t.id} style={{
        marginBottom: 12,
        ...(t.status === "APPROVED" ? { border: "0.5px solid rgba(0,207,164,0.3)" } : {}),
        ...(t.status === "DISPUTED" ? { border: "0.5px solid rgba(255,107,107,0.3)" } : {}),
      }}>
        <div
          style={{ display: "flex", gap: 12, cursor: "pointer" }}
          onClick={() => setExpanded(open ? null : t.id)}
        >
          <Avatar name={nm} size={48} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{nm}</div>
                <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>
                  {role}
                </div>
                {t.worker && (
                  <div style={{ marginTop: 3 }}><Stars value={t.worker.rating} /></div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                {t.status === "PENDING"  && <span style={{ fontSize: 11, color: "var(--orange)", fontWeight: 600 }}>Aguardando ▸</span>}
                {t.status === "APPROVED" && <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>Aprovado ✓</span>}
                {t.status === "DISPUTED" && <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 600 }}>Em disputa</span>}
              </div>
            </div>
          </div>
        </div>

        {open && (
          <div style={{ marginTop: 16 }}>
            <Divider />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                ["Check-in (GPS)", checkInFmt, "var(--primary)"],
                ["Check-out (GPS)", checkOutFmt, "var(--primary)"],
              ].map(([l, v, c]) => (
                <div key={l as string} style={{
                  background: "var(--surface-2)",
                  borderRadius: 9,
                  padding: "10px 13px",
                }}>
                  <div style={{ fontSize: 10, color: "var(--txt-3)", marginBottom: 4 }}>{l as string}</div>
                  <div style={{ fontSize: 14, color: c as string, fontWeight: 600 }}>{v as string}</div>
                  <div style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 3 }}>✓ Posição verificada</div>
                </div>
              ))}
            </div>

            <div style={{
              padding: "12px 14px",
              background: "var(--surface-2)",
              borderRadius: 9,
              marginBottom: 14,
            }}>
              <InfoRow label="Horas trabalhadas" value={`${workedH}h`} />
              <InfoRow label="Turno confirmado" value={role} />
            </div>

            {t.status === "PENDING" && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button full loading={acting === t.id} onClick={() => approve(t.id)}>
                  ✓ Aprovar e pagar
                </Button>
                <Button variant="secondary" loading={acting === t.id} onClick={() => dispute(t.id)}>
                  Contestar
                </Button>
              </div>
            )}

            {t.status === "APPROVED" && (
              <div style={{
                padding: "10px 14px",
                background: "var(--primary-dim)",
                borderRadius: 9,
                fontSize: 12,
                color: "var(--primary)",
              }}>
                ✓ Aprovado — Pagamento processado via Pix
              </div>
            )}
          </div>
        )}
      </Card>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Timesheet</h1>
        <p style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 2 }}>
          Aprovação de jornadas com check-in/out por GPS
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Pendentes",  count: pending.length,  color: "var(--orange)" },
          { label: "Aprovados",  count: approved.length, color: "var(--primary)" },
          { label: "Em disputa", count: disputed.length, color: "var(--red)" },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-value" style={{ color: m.color }}>{m.count}</div>
            <div className="metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
          <Spinner />
        </div>
      ) : sheets.length === 0 ? (
        <EmptyState
          icon="⏱"
          title="Nenhum timesheet ainda"
          desc="Quando um trabalhador fizer check-in no turno, aparecerá aqui para aprovação."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div className="label" style={{ marginBottom: 10 }}>Pendentes de aprovação</div>
              {pending.map(t => <TimesheetCard key={t.id} t={t} />)}
            </div>
          )}
          {approved.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div className="label" style={{ marginBottom: 10 }}>Aprovados</div>
              {approved.map(t => <TimesheetCard key={t.id} t={t} />)}
            </div>
          )}
          {disputed.length > 0 && (
            <div>
              <div className="label" style={{ marginBottom: 10 }}>Em disputa</div>
              {disputed.map(t => <TimesheetCard key={t.id} t={t} />)}
            </div>
          )}
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
