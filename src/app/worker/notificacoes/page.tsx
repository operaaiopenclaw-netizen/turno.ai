"use client"
// src/app/worker/notificacoes/page.tsx
import { useState, useEffect } from "react"
import { Card, Spinner, EmptyState } from "@/components/ui"
import { formatDateTime } from "@/lib/utils"

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  APPLICATION_ACCEPTED: { icon: "✅", color: "var(--primary)" },
  APPLICATION_REJECTED: { icon: "❌", color: "var(--red)" },
  TIMESHEET_APPROVED:   { icon: "⏱", color: "var(--orange)" },
  PAYMENT_SENT:         { icon: "⚡", color: "var(--primary)" },
  SHIFT_MATCH:          { icon: "🎯", color: "var(--purple)" },
  REVIEW_RECEIVED:      { icon: "⭐", color: "var(--orange)" },
  NEW_APPLICANT:        { icon: "👤", color: "var(--primary)" },
  CHECKIN_REMINDER:     { icon: "📍", color: "var(--orange)" },
}

export default function NotificacoesPage() {
  const [notifs,  setNotifs]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res  = await fetch("/api/notifications")
      const json = await res.json()
      setNotifs(json.data ?? [])
      setLoading(false)
      // Mark all as read
      fetch("/api/notifications", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ readAll: true }),
      })
    }
    load()
  }, [])

  const unread = notifs.filter(n => !n.read).length

  return (
    <div>
      <div style={{
        padding: "18px 20px 14px",
        background: "var(--surface)",
        borderBottom: "0.5px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Notificações</div>
          {unread > 0 && (
            <span style={{
              background: "var(--primary)",
              color: "#001a12",
              borderRadius: 20,
              padding: "2px 9px",
              fontSize: 12,
              fontWeight: 700,
            }}>{unread} novas</span>
          )}
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Spinner />
          </div>
        ) : notifs.length === 0 ? (
          <EmptyState icon="🔔" title="Nenhuma notificação" desc="Suas notificações aparecerão aqui." />
        ) : (
          notifs.map(n => {
            const cfg = TYPE_CONFIG[n.type] ?? { icon: "🔔", color: "var(--txt-2)" }
            return (
              <Card
                key={n.id}
                style={{
                  marginBottom: 10,
                  ...(!n.read ? {
                    borderColor: "rgba(0,207,164,0.2)",
                    background: "rgba(0,207,164,0.04)",
                  } : {}),
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 38, height: 38,
                    background: `${cfg.color}18`,
                    border: `1px solid ${cfg.color}30`,
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0,
                  }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: n.read ? 500 : 700,
                      color: "#fff",
                      fontSize: 13,
                      marginBottom: 3,
                    }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: "var(--txt-2)", lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 5 }}>
                      {formatDateTime(n.createdAt)}
                    </div>
                  </div>
                  {!n.read && (
                    <div style={{
                      width: 8, height: 8,
                      background: "var(--primary)",
                      borderRadius: "50%",
                      flexShrink: 0,
                      marginTop: 4,
                    }} />
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
