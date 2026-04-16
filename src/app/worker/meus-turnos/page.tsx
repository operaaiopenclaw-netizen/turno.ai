"use client"
// src/app/worker/meus-turnos/page.tsx
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Application } from "@/types"
import { Badge, Card, Divider, EmptyState, Spinner } from "@/components/ui"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

const STATUS_MAP: Record<string, { label: string; color: "primary" | "orange" | "red" | "gray" | "purple" }> = {
  PENDING:   { label: "Aguardando",  color: "orange" },
  ACCEPTED:  { label: "Contratado!", color: "primary" },
  REJECTED:  { label: "Não aprovado", color: "red" },
  CONFIRMED: { label: "Confirmado", color: "primary" },
  NO_SHOW:   { label: "Não compareceu", color: "red" },
}

export default function MyShiftsPage() {
  const { data: session } = useSession()
  const [apps,    setApps]    = useState<Application[]>([])
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
  const history = apps.filter(a => ["REJECTED", "NO_SHOW"].includes(a.status))

  const list = tab === "active" ? active : history

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "20px 20px 0", borderBottom: "0.5px solid var(--border)" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Meus Turnos</div>
        <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2, marginBottom: 14 }}>
          {active.length} candidatura{active.length !== 1 ? "s" : ""} ativa{active.length !== 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {[["active", "Ativas"], ["history", "Histórico"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v as "active" | "history")}
              style={{
                padding: "8px 20px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${tab === v ? "var(--primary)" : "transparent"}`,
                color: tab === v ? "var(--primary)" : "var(--txt-2)",
                fontSize: 13,
                fontFamily: "inherit",
                fontWeight: tab === v ? 600 : 400,
                cursor: "pointer",
                transition: "all .15s",
                marginBottom: -0.5,
              }}
            >{l}</button>
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
            const s   = app.shift
            const st  = STATUS_MAP[app.status] ?? STATUS_MAP.PENDING
            return (
              <Card key={app.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{s.role}</div>
                    <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>
                      {s.company?.tradeName}
                    </div>
                  </div>
                  <Badge color={st.color}>{st.label}</Badge>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <Badge color="gray">📅 {formatDate(s.date)}</Badge>
                  <Badge color="gray">⏰ {s.startTime}–{s.endTime}</Badge>
                </div>

                <Divider />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--txt-2)" }}>
                    💰 {formatCurrency(s.totalPay)} após aprovação
                  </span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>⚡ Pix</span>
                    {app.status === "ACCEPTED" && !app.timesheet && (
                      <Badge color="orange">Check-in pendente</Badge>
                    )}
                    {app.timesheet?.status === "APPROVED" && (
                      <Badge color="primary">Pago ✓</Badge>
                    )}
                  </div>
                </div>

                {app.payment?.status === "PAID" && (
                  <div style={{
                    marginTop: 10,
                    padding: "10px 14px",
                    background: "var(--primary-dim)",
                    borderRadius: 9,
                    fontSize: 12,
                    color: "var(--primary)",
                  }}>
                    ⚡ Pix enviado — {formatCurrency(app.payment.netAmount)}
                    {app.payment.blockchainTxHash && (
                      <span style={{ color: "var(--txt-3)", marginLeft: 6 }}>
                        · Blockchain confirmado ⛓
                      </span>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
