"use client"
// src/app/worker/avaliar/[shiftId]/page.tsx
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Card, Spinner } from "@/components/ui"

export default function AvaliarPage() {
  const { shiftId } = useParams() as { shiftId: string }
  const router      = useRouter()
  const [shift,     setShift]   = useState<any>(null)
  const [loading,   setLoading] = useState(true)
  const [rating,    setRating]  = useState(0)
  const [hovered,   setHovered] = useState(0)
  const [comment,   setComment] = useState("")
  const [submitting,setSubmitting] = useState(false)
  const [done,      setDone]    = useState(false)

  useEffect(() => {
    async function load() {
      const res  = await fetch(`/api/shifts/${shiftId}`)
      const json = await res.json()
      setShift(json.data)
      setLoading(false)
    }
    load()
  }, [shiftId])

  async function submit() {
    if (rating === 0) return
    setSubmitting(true)
    await fetch("/api/reviews", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        shiftId,
        rating,
        comment,
        revieweeId: shift?.companyId,
      }),
    })
    setDone(true)
    setTimeout(() => router.push("/worker/meus-turnos"), 2000)
    setSubmitting(false)
  }

  if (loading) return <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}><Spinner /></div>

  const LABELS = ["", "Muito ruim", "Ruim", "OK", "Bom", "Excelente!"]

  return (
    <div style={{ padding: "0 0 32px" }}>
      <div style={{
        padding: "16px 20px",
        background: "var(--surface)",
        borderBottom: "0.5px solid var(--border)",
        display: "flex", alignItems: "center", gap: 14,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--txt-2)", fontSize: 20, cursor: "pointer" }}>←</button>
        <span style={{ fontWeight: 600, color: "#fff", fontSize: 15 }}>Avaliar empresa</span>
      </div>

      <div style={{ padding: "24px 16px" }}>
        {done ? (
          <div style={{
            background: "var(--primary-dim)",
            border: "0.5px solid rgba(0,207,164,0.3)",
            borderRadius: 12, padding: "40px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Avaliação enviada!</div>
            <div style={{ fontSize: 13, color: "var(--txt-2)" }}>Obrigado pelo seu feedback.</div>
          </div>
        ) : (
          <Card>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: "var(--txt-2)", marginBottom: 4 }}>Como foi trabalhar em</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{shift?.company?.tradeName}</div>
              <div style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 4 }}>{shift?.role} · {shift?.neighborhood}</div>
            </div>

            {/* Star selector */}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 8 }}>
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  style={{
                    fontSize: 36, background: "none", border: "none",
                    cursor: "pointer", lineHeight: 1,
                    filter: n <= (hovered || rating) ? "none" : "grayscale(1) opacity(0.3)",
                    transform: n <= (hovered || rating) ? "scale(1.1)" : "scale(1)",
                    transition: "all .15s",
                  }}
                >⭐</button>
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: 14, color: "var(--orange)", fontWeight: 600, marginBottom: 20, minHeight: 20 }}>
              {LABELS[hovered || rating]}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "var(--txt-2)", marginBottom: 6 }}>Comentário (opcional)</div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Como foi a organização do evento? O ambiente era adequado? A empresa foi respeitosa?"
                rows={4}
                style={{
                  width: "100%", padding: "11px 14px",
                  background: "var(--surface-2)",
                  border: "0.5px solid var(--border-2)",
                  borderRadius: 9, color: "var(--txt)", fontSize: 13,
                  outline: "none", fontFamily: "inherit", resize: "vertical",
                  boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                onBlur={e => (e.target.style.borderColor = "var(--border-2)")}
              />
            </div>

            <Button full loading={submitting} disabled={rating === 0} onClick={submit}>
              Enviar avaliação
            </Button>
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <button onClick={() => router.back()} style={{
                background: "none", border: "none", color: "var(--txt-3)",
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>
                Pular avaliação
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
