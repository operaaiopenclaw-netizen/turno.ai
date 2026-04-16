"use client"
// src/app/empresa/candidatos/page.tsx
import { useState, useEffect } from "react"
import { Application } from "@/types"
import { Avatar, Stars, Badge, Card, Divider, Spinner, EmptyState } from "@/components/ui"
import { Button } from "@/components/ui/Button"
import { formatDate } from "@/lib/utils"

export default function CandidatosPage() {
  const [apps,    setApps]    = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState<string | null>(null)
  const [toast,   setToast]   = useState("")
  const [filter,  setFilter]  = useState("PENDING")

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

  async function decide(appId: string, status: "ACCEPTED" | "REJECTED") {
    setDeciding(appId)
    const res  = await fetch(`/api/applications/${appId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    })
    if (res.ok) {
      setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
      setToast(status === "ACCEPTED" ? "Contratado! Notificação enviada ✓" : "Candidatura recusada")
      setTimeout(() => setToast(""), 3000)
    }
    setDeciding(null)
  }

  const grouped = apps.reduce<Record<string, Application[]>>((acc, a) => {
    const key = a.shift?.role ?? "Sem turno"
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  const filtered = filter === "ALL" ? apps : apps.filter(a => a.status === filter)

  const counts = {
    PENDING:  apps.filter(a => a.status === "PENDING").length,
    ACCEPTED: apps.filter(a => a.status === "ACCEPTED").length,
    REJECTED: apps.filter(a => a.status === "REJECTED").length,
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Candidatos</h1>
        <p style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 2 }}>
          Todos os candidatos aos seus turnos
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Pendentes",   count: counts.PENDING,  color: "var(--orange)" },
          { label: "Contratados", count: counts.ACCEPTED, color: "var(--primary)" },
          { label: "Recusados",   count: counts.REJECTED, color: "var(--red)" },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-value" style={{ color: m.color }}>{m.count}</div>
            <div className="metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--border)", marginBottom: 20 }}>
        {[["PENDING", "Pendentes"], ["ACCEPTED", "Contratados"], ["REJECTED", "Recusados"], ["ALL", "Todos"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            style={{
              padding: "8px 18px",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${filter === v ? "var(--primary)" : "transparent"}`,
              color: filter === v ? "var(--primary)" : "var(--txt-2)",
              fontSize: 13,
              fontFamily: "inherit",
              fontWeight: filter === v ? 600 : 400,
              cursor: "pointer",
              marginBottom: -0.5,
              transition: "all .15s",
            }}
          >{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="👥" title="Nenhum candidato encontrado" />
      ) : (
        filtered.map(app => {
          if (!app.worker) return null
          const w  = app.worker
          const nm = w.user?.name ?? "Trabalhador"
          return (
            <Card key={app.id} style={{
              marginBottom: 12,
              ...(app.status === "ACCEPTED" ? { border: "0.5px solid rgba(0,207,164,0.3)", background: "rgba(0,207,164,0.04)" } : {}),
              ...(app.status === "REJECTED" ? { border: "0.5px solid rgba(255,107,107,0.2)", opacity: 0.7 } : {}),
            }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Avatar name={nm} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{nm}</div>
                      <div style={{ marginTop: 2 }}><Stars value={w.rating} /></div>
                      <div style={{ fontSize: 11, color: "var(--txt-3)", marginTop: 2 }}>
                        {w.totalShifts} turnos · {w.neighborhood}
                      </div>
                    </div>
                    {app.status === "ACCEPTED" && <Badge color="primary">✓ Contratado</Badge>}
                    {app.status === "REJECTED" && <Badge color="red">Recusado</Badge>}
                  </div>

                  {w.bio && (
                    <p style={{ fontSize: 12, color: "var(--txt-2)", margin: "8px 0", lineHeight: 1.5 }}>
                      {w.bio}
                    </p>
                  )}

                  {/* Skills */}
                  {w.skills && w.skills.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                      {w.skills.slice(0, 4).map(s => (
                        <Badge key={s.id} color="gray">{s.skill}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Shift info */}
                  {app.shift && (
                    <div style={{ fontSize: 11, color: "var(--txt-3)", marginBottom: 10 }}>
                      Para: {app.shift.role} · {formatDate(app.shift.date)}
                    </div>
                  )}

                  {/* Actions */}
                  {app.status === "PENDING" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        size="sm"
                        loading={deciding === app.id}
                        onClick={() => decide(app.id, "ACCEPTED")}
                      >
                        Contratar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={deciding === app.id}
                        onClick={() => decide(app.id, "REJECTED")}
                      >
                        Recusar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })
      )}

      {toast && (
        <div className="toast" style={{
          color: toast.includes("✓") ? "var(--primary)" : "var(--txt-2)",
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
