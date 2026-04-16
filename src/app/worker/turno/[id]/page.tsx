"use client"
// src/app/worker/turno/[id]/page.tsx
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Shift } from "@/types"
import { Button } from "@/components/ui/Button"
import { Badge, Card, Stars, Divider, Spinner } from "@/components/ui"
import { formatCurrency, formatDate, CATEGORY_COLORS } from "@/lib/utils"
import { INDUSTRY_EMOJI } from "@/types"

export default function ShiftDetailPage() {
  const { id }            = useParams() as { id: string }
  const { data: session } = useSession()
  const router            = useRouter()
  const [shift,     setShift]     = useState<Shift | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [applying,  setApplying]  = useState(false)
  const [applied,   setApplied]   = useState(false)
  const [toast,     setToast]     = useState("")

  const workerId = (session?.user as any)?.workerId

  useEffect(() => {
    async function load() {
      const res  = await fetch(`/api/shifts/${id}`)
      const json = await res.json()
      setShift(json.data)
      setApplied(!!json.data?.userApplication)
      setLoading(false)
    }
    load()
  }, [id])

  async function apply() {
    if (!workerId) { router.push("/login"); return }
    setApplying(true)
    const res  = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId: id }),
    })
    const json = await res.json()
    if (res.ok) {
      setApplied(true)
      setToast("Candidatura enviada! ✓")
      setTimeout(() => setToast(""), 3000)
    } else {
      setToast(json.error ?? "Erro ao candidatar")
    }
    setApplying(false)
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner /></div>
  )
  if (!shift) return (
    <div style={{ padding: 24, color: "var(--txt-2)" }}>Turno não encontrado.</div>
  )

  const color = CATEGORY_COLORS[shift.category]
  const spotsLeft = shift.spots - shift.filledSpots

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        background: "var(--surface)",
        borderBottom: "0.5px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "var(--txt-2)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
        >←</button>
        <span style={{ fontWeight: 600, color: "#fff", fontSize: 15 }}>Detalhes do turno</span>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        {/* Main info card */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
                {shift.role}
              </div>
              <div style={{ color: "var(--txt-2)", fontSize: 13, marginTop: 3 }}>
                {shift.company.tradeName}
              </div>
              <div style={{ marginTop: 6 }}>
                <Stars value={shift.company.rating} />
                <span style={{ color: "var(--txt-3)", fontSize: 11 }}> · empresa</span>
              </div>
            </div>
            <div style={{
              width: 52, height: 52,
              background: `${color}15`,
              border: `1px solid ${color}30`,
              borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>
              {INDUSTRY_EMOJI[shift.category]}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["📅 Data",      formatDate(shift.date),        "#fff"],
              ["⏰ Horário",   `${shift.startTime}–${shift.endTime}`, "#fff"],
              ["📍 Local",     shift.neighborhood,            "#fff"],
              ["💰 Pagamento", formatCurrency(shift.totalPay), "var(--primary)"],
            ].map(([k, v, c]) => (
              <div key={k as string} style={{
                background: "var(--surface-2)",
                borderRadius: 9,
                padding: "10px 13px",
              }}>
                <div style={{ fontSize: 10, color: "var(--txt-3)", marginBottom: 4 }}>{k as string}</div>
                <div style={{ fontSize: 13, color: c as string, fontWeight: 600 }}>{v as string}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Description */}
        <Card style={{ marginBottom: 12 }}>
          <div className="label">Sobre o turno</div>
          <p style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.65 }}>
            {shift.description}
          </p>
          {shift.requirements && (
            <>
              <Divider />
              <div className="label">Requisitos</div>
              <p style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.65 }}>
                {shift.requirements}
              </p>
            </>
          )}
          {shift.dresscode && (
            <>
              <Divider />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--txt-3)" }}>👔 Dress code:</span>
                <span style={{ fontSize: 13, color: "#fff" }}>{shift.dresscode}</span>
              </div>
            </>
          )}
        </Card>

        {/* Spots */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--txt-3)" }}>Vagas disponíveis</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>
                {spotsLeft}
                <span style={{ fontSize: 13, color: "var(--txt-2)", fontWeight: 400 }}> vagas</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "var(--txt-3)", marginBottom: 3 }}>Candidatos</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--orange)" }}>
                {shift._count?.applications ?? 0}
              </div>
            </div>
          </div>
        </Card>

        {/* Apply button */}
        {applied ? (
          <div style={{
            background: "var(--primary-dim)",
            border: "1px solid rgba(0,207,164,0.3)",
            borderRadius: 12,
            padding: "20px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ color: "var(--primary)", fontWeight: 700, fontSize: 15 }}>
              Candidatura enviada!
            </div>
            <div style={{ color: "var(--txt-2)", fontSize: 12, marginTop: 6 }}>
              A empresa confirmará em breve. Você receberá uma notificação.
            </div>
          </div>
        ) : (
          <Button full size="lg" onClick={apply} loading={applying} disabled={spotsLeft <= 0}>
            {spotsLeft <= 0 ? "Turno completo" : "Candidatar-me a este turno"}
          </Button>
        )}
      </div>

      {toast && (
        <div className="toast" style={{
          color: toast.includes("✓") ? "var(--primary)" : "var(--red)",
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
