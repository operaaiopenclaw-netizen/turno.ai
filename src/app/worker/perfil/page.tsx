"use client"
// src/app/worker/perfil/page.tsx
import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Worker } from "@/types"
import { Avatar, Stars, Card, Badge, SectionLabel, Divider, Spinner, InfoRow } from "@/components/ui"
import { Button } from "@/components/ui/Button"
import { formatCurrency } from "@/lib/utils"

export default function WorkerProfilePage() {
  const { data: session } = useSession()
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const workerId = (session?.user as any)?.workerId
      if (!workerId) { setLoading(false); return }
      const res  = await fetch(`/api/workers/${workerId}`)
      const json = await res.json()
      setWorker(json.data)
      setLoading(false)
    }
    load()
  }, [session])

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <Spinner />
    </div>
  )

  const name = session?.user?.name ?? "Trabalhador"

  return (
    <div style={{ padding: "28px 16px 0" }}>
      {/* Avatar + name */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Avatar name={name} size={72} />
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 12, letterSpacing: -0.5 }}>
          {name}
        </div>
        {worker && (
          <>
            <div style={{ marginTop: 4 }}><Stars value={worker.rating} /></div>
            <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 4 }}>
              {worker.totalShifts} turnos completados · {worker.neighborhood}, Curitiba
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      {worker && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            [formatCurrency(worker.totalEarnings), "Ganhos",   "var(--primary)"],
            [String(worker.totalShifts),            "Turnos",   "#fff"],
            [worker.rating.toFixed(1),              "Avaliação","var(--orange)"],
          ].map(([n, l, c]) => (
            <Card key={l} style={{ textAlign: "center", padding: "14px 8px" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{n}</div>
              <div style={{ fontSize: 11, color: "var(--txt-3)", marginTop: 2 }}>{l}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Skills */}
      {worker?.skills && worker.skills.length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <SectionLabel>Habilidades verificadas</SectionLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {worker.skills.map(s => <Badge key={s.id}>{s.skill}</Badge>)}
          </div>
        </Card>
      )}

      {/* Documents */}
      <Card style={{ marginBottom: 12 }}>
        <SectionLabel>Documentação</SectionLabel>
        {[
          [worker?.cpfVerified ? "✓" : "○", "CPF verificado",         worker?.cpfVerified],
          [worker?.pixKey       ? "✓" : "○", "Chave Pix cadastrada",   !!worker?.pixKey],
          [worker?.backgroundCheck === "CLEAR" ? "✓" : "○", "Antecedentes — OK", worker?.backgroundCheck === "CLEAR"],
        ].map(([ic, label, ok]) => (
          <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
            <span style={{ color: ok ? "var(--primary)" : "var(--txt-3)", fontSize: 14 }}>{ic as string}</span>
            <span style={{ fontSize: 13, color: ok ? "var(--txt-2)" : "var(--txt-3)" }}>{label as string}</span>
          </div>
        ))}
      </Card>

      {/* Pix key */}
      {worker?.pixKey && (
        <Card style={{ marginBottom: 12, background: "var(--primary-dim)", border: "0.5px solid rgba(0,207,164,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Chave Pix cadastrada</div>
              <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>{worker.pixKey}</div>
            </div>
            <span style={{ color: "var(--primary)", fontSize: 22 }}>⚡</span>
          </div>
        </Card>
      )}

      {/* Bio */}
      {worker?.bio && (
        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>Sobre mim</SectionLabel>
          <p style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.65 }}>{worker.bio}</p>
        </Card>
      )}

      <Button variant="secondary" full onClick={() => signOut({ callbackUrl: "/" })}>
        Sair da conta
      </Button>
    </div>
  )
}
