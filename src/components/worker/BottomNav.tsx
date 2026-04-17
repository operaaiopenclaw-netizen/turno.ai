"use client"
// src/components/worker/BottomNav.tsx — SSE em vez de polling

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, useRef } from "react"

const TABS = [
  { href: "/worker",              icon: "🔍", label: "Turnos"      },
  { href: "/worker/meus-turnos",  icon: "📋", label: "Meus Turnos" },
  { href: "/worker/carteira",     icon: "💳", label: "Carteira"    },
  { href: "/worker/notificacoes", icon: "🔔", label: "Alertas"     },
  { href: "/worker/perfil",       icon: "👤", label: "Perfil"      },
]

export function BottomNav() {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    function connect() {
      if (esRef.current) esRef.current.close()
      const es = new EventSource("/api/notifications/stream")
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === "unread_count") setUnread(data.count ?? 0)
        } catch {}
      }

      es.onerror = () => {
        es.close()
        // Reconecta após 15s se a conexão cair
        setTimeout(connect, 15_000)
      }
    }

    connect()
    return () => { esRef.current?.close() }
  }, [])

  return (
    <nav style={{
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      background: "var(--surface)",
      borderTop: "0.5px solid var(--border)",
      display: "flex",
      zIndex: 50,
      maxWidth: 480,
      margin: "0 auto",
      paddingBottom: "env(safe-area-inset-bottom, 8px)",
    }}>
      {TABS.map(tab => {
        const isActive = tab.href === "/worker" ? pathname === "/worker" : pathname.startsWith(tab.href)
        const isNotif  = tab.href === "/worker/notificacoes"
        return (
          <Link key={tab.href} href={tab.href} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "8px 0", gap: 2, textDecoration: "none",
          }}>
            <span style={{ fontSize: 19, lineHeight: 1, position: "relative" }}>
              {tab.icon}
              {isNotif && unread > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -7,
                  background: "var(--red)", color: "#fff",
                  borderRadius: 20, padding: "1px 5px",
                  fontSize: 9, fontWeight: 700, lineHeight: 1.4,
                  minWidth: 16, textAlign: "center",
                }}>{unread > 9 ? "9+" : unread}</span>
              )}
            </span>
            <span style={{
              fontSize: 9,
              color: isActive ? "var(--primary)" : "var(--txt-3)",
              fontWeight: isActive ? 600 : 400,
            }}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
