"use client"
// src/app/worker/meus-turnos/page.tsx
import { useState, useEffect } from "react"
import Link from "next/link"
import { Application } from "@/types"
import { Badge, Card, Divider, EmptyState, Spinner } from "@/components/ui"
import { formatCurrency, formatDate } from "@/lib/utils"

const STATUS_MAP: Record<string, { label: string; color: "primary" | "orange" | "red" | "gray" | "purple" }> = {
  PENDING:   { label: "Aguardando",        color: "orange"  },
  ACCEPTED:  { label: "Contratado!",       color: "primary" },
  REJECTED:  { label: "Não aprovado",      color: "red"     },
  CONFIRMED: { label: "Confirmado",        color: "primary" },
  NO_SHOW:   { label: "Não compareceu",    color: "red"     },
}

interface TimesheetInfo {
  id: string
  checkInAt: string | null
  checkOutAt: string | null
  status: string
  hoursWorked: number | null
}

interface PaymentInfo {
  id: string
  netAmount: number
  status: string
  blockchainTxHash: string | null
  settlementType?: string
}

type AppWithExtras = Omit<Application, "timesheet" | "payment"> & {
  timesheet?: TimesheetInfo | null
  payment?: PaymentInfo | null
}

export default function MyShiftsPage() {
  const [apps,    setApps]    = useState<AppWithExtras[]>([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<"active" | "history">("active")

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res  = await fetch("/api/applications")
      const json = await res.json()
      setApps(json.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const active  = apps.filter(a => ["PENDING", "ACCEPTED", "CONFIRMED"].includes(a.status))
  const history = apps.filter(a =>
    ["REJECTED", "NO_SHOW"].includes(a.status) ||
    (a.payment?.status === "PAID")
  )
  const list = tab === "active" ? active : history

  return (
    <div>
      <div style={{ padding: "20px 20px 0", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Meus Turnos</div>
        <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2, marginBottom: 14 }}>
          {active.length} candidatura{active.length !== 1 ? "s" : ""} ativa{active.length !== 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {(["active", "history"] as const).map(v => (
            <button key={v} onClick={() => setTab(v)} style={{
              padding: "8px 20px", background: "none", border: "none",
              borderBottom: `2px solid ${tab === v ? "var(--primary)" : "transparent"}`,
              color: tab === v ? "var(--primary)" : "var(--txt-2)",
              fontSize: 13, fontFamily: "inherit",
              fontWeight: tab === v ? 600 : 400,
              cursor: "pointer", marginBottom: -0.5,
            }}>
              {v === "active" ? "Ativas" : "Histórico"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={tab === "active" ? "📋" : "📁"}
            title={tab === "active" ? "Nenhuma candidatura ativa" : "Nenhum histórico"}
            desc={tab === "active" ? "Explore os turnos disponíveis na aba Turnos" : undefined}
          />
        ) : (
          list.map(app => {
            if (!app.shift) return null
            const s  = app.shift
            const st = STATUS_MAP[app.status] ?? STATUS_MAP.PENDING

            const ts = app.timesheet
            const canCheckin  = app.status === "ACCEPTED" && ts && !ts.checkInAt
            const canCheckout = app.status === "ACCEPTED" && ts?.checkInAt && !ts.checkOutAt
            const awaitingApproval = ts?.checkOutAt && ts.status === "PENDING"
            const isPaid = app.payment?.status === "PAID"
            const canReview = isPaid

            return (
              <Card key={app.id} style={{ marginBottom: 12 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{s.role}</div>
                    <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>
                      {(s as { company?: { tradeName?: string } }).company?.tradeName}
                    </div>
                  </div>
                  <Badge color={st.color}>{st.label}</Badge>
                </div>

                {/* Date/time pills */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <Badge color="gray">📅 {formatDate(s.date)}</Badge>
                  <Badge color="gray">⏰ {s.startTime}–{s.endTime}</Badge>
                  {s.neighborhood && <Badge color="gray">📍 {s.neighborhood}</Badge>}
                </div>

                <Divider />

                {/* Payment info */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--txt-2)" }}>
                    💰 {formatCurrency(s.totalPay)}
                  </span>
                  {isPaid && app.payment && (
                    <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 700 }}>
                      ✅ Pago — {formatCurrency(app.payment.netAmount)}
                    </span>
                  )}
                </div>

                {/* Blockchain badge */}
                {app.payment?.blockchainTxHash && (
                  <div style={{
                    padding: "8px 12px", background: "rgba(124,58,237,0.1)",
                    borderRadius: 8, fontSize: 11, color: "var(--primary)",
                    marginBottom: 8, fontWeight: 600,
                  }}>
                    ⛓ Registro blockchain confirmado
                  </div>
                )}

                {/* Wallet payment info */}
                {isPaid && app.payment && (
                  <div style={{
                    padding: "8px 12px", marginBottom: 8,
                    background: "rgba(34,197,94,0.08)",
                    borderRadius: 8, fontSize: 12, color: "#22c55e",
                  }}>
                    {(app.payment as { settlementType?: string }).settlementType === "WALLET"
                      ? "💳 Creditado na sua carteira Turno"
                      : "⚡ Enviado via PIX"}
                  </div>
                )}

                {/* CTAs */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {canCheckin && ts && (
                    <Link href={`/worker/checkin/${ts.id}`} style={{
                      flex: 1, padding: "0.6rem 1rem", borderRadius: 8,
                      background: "var(--primary)", color: "#fff",
                      textAlign: "center", textDecoration: "none",
                      fontWeight: 700, fontSize: 13,
                    }}>
                      📍 Fazer Check-in
                    </Link>
                  )}
                  {canCheckout && ts && (
                    <Link href={`/worker/checkin/${ts.id}`} style={{
                      flex: 1, padding: "0.6rem 1rem", borderRadius: 8,
                      background: "#f97316", color: "#fff",
                      textAlign: "center", textDecoration: "none",
                      fontWeight: 700, fontSize: 13,
                    }}>
                      🏁 Fazer Check-out
                    </Link>
                  )}
                  {awaitingApproval && (
                    <div style={{
                      flex: 1, padding: "0.6rem 1rem", borderRadius: 8,
                      background: "var(--bg-card)", color: "var(--txt-2)",
                      textAlign: "center", fontSize: 12,
                    }}>
                      ⏳ Aguardando aprovação
                    </div>
                  )}
                  {canReview && (
                    <Link href={`/worker/avaliar/${s.id}`} style={{
                      padding: "0.6rem 1rem", borderRadius: 8,
                      background: "var(--bg-card)", color: "var(--primary)",
                      border: "1px solid var(--primary)",
                      textDecoration: "none", fontWeight: 600, fontSize: 13,
                    }}>
                      ⭐ Avaliar
                    </Link>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
