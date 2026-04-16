"use client"
// src/app/worker/page.tsx
import { useState, useEffect } from "react"
import { ShiftCard } from "@/components/worker/ShiftCard"
import { Spinner, EmptyState, Avatar } from "@/components/ui"
import { Shift, Industry } from "@/types"
import { INDUSTRY_LABELS, INDUSTRY_EMOJI } from "@/types"
import { useSession } from "next-auth/react"

const FILTERS: { value: string; label: string; emoji: string }[] = [
  { value: "all",         label: "Todos",      emoji: "🗂" },
  { value: "HOSPITALITY", label: "Hospitality", emoji: "🍺" },
  { value: "EVENTS",      label: "Eventos",    emoji: "🎪" },
]

export default function WorkerHomePage() {
  const { data: session } = useSession()
  const [shifts,  setShifts]  = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState("all")

  const workerId = (session?.user as any)?.workerId

  useEffect(() => {
    async function load() {
      setLoading(true)
      const params = new URLSearchParams({ status: "OPEN" })
      if (filter !== "all") params.set("category", filter)
      if (workerId)          params.set("workerId", workerId)
      const res  = await fetch(`/api/shifts?${params}`)
      const json = await res.json()
      setShifts(json.data ?? [])
      setLoading(false)
    }
    load()
  }, [filter, workerId])

  const workerName = session?.user?.name ?? "Trabalhador"
  const firstName  = workerName.split(" ")[0]

  return (
    <div>
      {/* Sticky header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "var(--surface)",
        borderBottom: "0.5px solid var(--border)",
        padding: "20px 20px 0",
      }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
              Olá, {firstName} 👋
            </div>
            <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>
              Curitiba · {shifts.length} turno{shifts.length !== 1 ? "s" : ""} disponível{shifts.length !== 1 ? "is" : ""}
            </div>
          </div>
          <Avatar name={workerName} size={38} />
        </div>

        {/* Filter pills */}
        <div style={{
          display: "flex",
          gap: 8,
          paddingBottom: 16,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: "7px 16px",
                borderRadius: 20,
                border: `0.5px solid ${filter === f.value ? "var(--primary)" : "var(--border-2)"}`,
                background: filter === f.value ? "var(--primary-dim)" : "transparent",
                color: filter === f.value ? "var(--primary)" : "var(--txt-2)",
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                fontWeight: filter === f.value ? 600 : 400,
                transition: "all .15s",
              }}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shifts list */}
      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Spinner />
          </div>
        ) : shifts.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Nenhum turno disponível"
            desc="Novos turnos são publicados diariamente. Volte em breve!"
          />
        ) : (
          shifts.map(s => <ShiftCard key={s.id} shift={s} />)
        )}
      </div>
    </div>
  )
}
