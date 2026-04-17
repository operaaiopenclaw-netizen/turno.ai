"use client"
// src/app/worker/perfil/page.tsx
import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { Avatar, Stars, Card, Badge, SectionLabel, Spinner } from "@/components/ui"
import { formatCurrency, CURITIBA_NEIGHBORHOODS } from "@/lib/utils"

const PIX_TYPES = ["CPF", "EMAIL", "PHONE", "RANDOM"] as const
const SKILL_SUGGESTIONS = [
  "Garçom", "Garçonete", "Bartender", "Recepcionista",
  "Auxiliar de Cozinha", "Cozinheiro", "Pizzaiolo",
  "Auxiliar de Eventos", "Segurança", "Limpeza",
  "Produtor de Eventos", "DJ", "Inglês fluente",
  "Espanhol", "Sommelier", "Sommelier básico",
  "Flair", "Drinks autorais", "Atendimento premium",
]

interface Worker {
  id: string; phone: string; bio?: string; address?: string
  pixKey?: string; pixKeyType?: string
  neighborhood?: string; city: string; state: string
  rating: number; totalShifts: number; totalEarnings: number
  cpfVerified: boolean; backgroundCheck: string
  skills: { id: string; skill: string }[]
  user: { name?: string; email?: string; image?: string }
}

export default function WorkerProfilePage() {
  const { data: session } = useSession()
  const [worker,   setWorker]   = useState<Worker | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  // edit state
  const [bio,          setBio]          = useState("")
  const [pixKey,       setPixKey]       = useState("")
  const [pixKeyType,   setPixKeyType]   = useState("EMAIL")
  const [neighborhood, setNeighborhood] = useState("")
  const [phone,        setPhone]        = useState("")
  const [skills,       setSkills]       = useState<string[]>([])
  const [skillInput,   setSkillInput]   = useState("")

  const workerId = (session?.user as { workerId?: string })?.workerId

  const load = useCallback(async () => {
    if (!workerId) { setLoading(false); return }
    const res  = await fetch(`/api/workers/${workerId}`)
    const json = await res.json()
    const w: Worker = json.data
    setWorker(w)
    setBio(w.bio ?? "")
    setPixKey(w.pixKey ?? "")
    setPixKeyType(w.pixKeyType ?? "EMAIL")
    setNeighborhood(w.neighborhood ?? "")
    setPhone(w.phone ?? "")
    setSkills(w.skills.map(s => s.skill))
    setLoading(false)
  }, [workerId])

  useEffect(() => { load() }, [load])

  const toast = (text: string, ok: boolean) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleSave() {
    if (!workerId) return
    setSaving(true)
    const r = await fetch(`/api/workers/${workerId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio, pixKey, pixKeyType, neighborhood, phone, skills }),
    })
    setSaving(false)
    if (r.ok) {
      toast("Perfil atualizado!", true)
      setEditing(false)
      load()
    } else {
      const d = await r.json()
      toast(d.error ?? "Erro ao salvar", false)
    }
  }

  function addSkill(s: string) {
    const trimmed = s.trim()
    if (trimmed && !skills.includes(trimmed)) setSkills(prev => [...prev, trimmed])
    setSkillInput("")
  }

  const name = worker?.user?.name ?? session?.user?.name ?? "Trabalhador"

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <Spinner />
    </div>
  )

  return (
    <div style={{ padding: "28px 16px 100px" }}>
      {msg && (
        <div style={{
          position: "fixed", top: "1rem", left: "50%", transform: "translateX(-50%)",
          background: msg.ok ? "#22c55e" : "#ef4444",
          color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "0.75rem",
          zIndex: 1000, fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap",
        }}>{msg.text}</div>
      )}

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Avatar name={name} size={72} />
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 12 }}>{name}</div>
        {worker && (
          <>
            <div style={{ marginTop: 4 }}><Stars value={worker.rating} /></div>
            <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 4 }}>
              {worker.totalShifts} turnos · {worker.neighborhood ?? "Curitiba"}
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      {worker && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            [formatCurrency(worker.totalEarnings), "Ganhos",    "var(--primary)"],
            [String(worker.totalShifts),           "Turnos",    "#fff"],
            [worker.rating.toFixed(1),             "Avaliação", "var(--orange)"],
          ].map(([n, l, c]) => (
            <div key={l as string} className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c as string }}>{n}</div>
              <div style={{ fontSize: 11, color: "var(--txt-3)", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toggle edit */}
      <button
        onClick={() => setEditing(e => !e)}
        style={{
          width: "100%", padding: "0.75rem", borderRadius: "0.75rem",
          background: editing ? "var(--bg-card)" : "var(--primary)",
          color: editing ? "var(--text-muted)" : "#fff",
          border: editing ? "1px solid var(--border)" : "none",
          fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", marginBottom: 16,
        }}>
        {editing ? "✕ Cancelar edição" : "✏️ Editar perfil"}
      </button>

      {editing ? (
        /* ── EDIT MODE ─────────────────────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <SectionLabel>Sobre mim</SectionLabel>
            <textarea
              value={bio} onChange={e => setBio(e.target.value)}
              rows={4} placeholder="Descreva sua experiência..."
              style={{
                width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "0.75rem", color: "var(--text-primary)",
                fontSize: "0.9rem", resize: "vertical", fontFamily: "inherit",
              }}
            />
          </Card>

          <Card>
            <SectionLabel>Chave PIX</SectionLabel>
            <select
              value={pixKeyType} onChange={e => setPixKeyType(e.target.value)}
              style={{
                width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "0.6rem 0.75rem", color: "var(--text-primary)",
                fontSize: "0.9rem", marginBottom: 8,
              }}>
              {PIX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="text" value={pixKey} onChange={e => setPixKey(e.target.value)}
              placeholder="Sua chave PIX"
              style={{
                width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "0.75rem", color: "var(--text-primary)", fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </Card>

          <Card>
            <SectionLabel>Bairro</SectionLabel>
            <select
              value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
              style={{
                width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "0.6rem 0.75rem", color: "var(--text-primary)", fontSize: "0.9rem",
              }}>
              <option value="">Selecione um bairro</option>
              {CURITIBA_NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Card>

          <Card>
            <SectionLabel>Telefone</SectionLabel>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="(41) 99999-0000"
              style={{
                width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "0.75rem", color: "var(--text-primary)", fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </Card>

          <Card>
            <SectionLabel>Habilidades</SectionLabel>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {skills.map(s => (
                <button key={s}
                  onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                  style={{
                    padding: "4px 10px", borderRadius: 20,
                    background: "var(--primary-dim)", color: "var(--primary)",
                    border: "1px solid var(--primary)", cursor: "pointer", fontSize: 12,
                  }}>
                  {s} ✕
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput) } }}
                placeholder="Adicionar habilidade..."
                style={{
                  flex: 1, background: "var(--bg-input)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "0.6rem 0.75rem", color: "var(--text-primary)", fontSize: "0.9rem",
                }}
              />
              <button onClick={() => addSkill(skillInput)}
                style={{
                  padding: "0.6rem 1rem", borderRadius: 8,
                  background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer",
                }}>+</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 8).map(s => (
                <button key={s} onClick={() => addSkill(s)}
                  style={{
                    padding: "3px 8px", borderRadius: 20,
                    background: "var(--bg-hover)", color: "var(--text-muted)",
                    border: "1px solid var(--border)", cursor: "pointer", fontSize: 11,
                  }}>+ {s}</button>
              ))}
            </div>
          </Card>

          <button
            onClick={handleSave} disabled={saving}
            style={{
              width: "100%", padding: "0.875rem", borderRadius: "0.75rem",
              background: saving ? "var(--bg-hover)" : "#22c55e",
              color: "#fff", border: "none", fontWeight: 700, fontSize: "0.95rem",
              cursor: saving ? "not-allowed" : "pointer",
            }}>
            {saving ? "Salvando..." : "✓ Salvar alterações"}
          </button>
        </div>
      ) : (
        /* ── VIEW MODE ─────────────────────────────────────────────── */
        <>
          {worker?.skills && worker.skills.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <SectionLabel>Habilidades</SectionLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {worker.skills.map(s => <Badge key={s.id}>{s.skill}</Badge>)}
              </div>
            </Card>
          )}

          <Card style={{ marginBottom: 12 }}>
            <SectionLabel>Documentação</SectionLabel>
            {[
              ["CPF verificado",         worker?.cpfVerified],
              ["Chave PIX cadastrada",   !!worker?.pixKey],
              ["Antecedentes OK",        worker?.backgroundCheck === "CLEAR"],
            ].map(([label, ok]) => (
              <div key={label as string} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
              }}>
                <span style={{ color: ok ? "var(--primary)" : "var(--txt-3)", fontSize: 14 }}>
                  {ok ? "✓" : "○"}
                </span>
                <span style={{ fontSize: 13, color: ok ? "var(--txt-2)" : "var(--txt-3)" }}>
                  {label as string}
                </span>
              </div>
            ))}
          </Card>

          {worker?.pixKey && (
            <Card style={{ marginBottom: 12, background: "var(--primary-dim)", border: "0.5px solid rgba(0,207,164,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Chave PIX — {worker.pixKeyType}</div>
                  <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>{worker.pixKey}</div>
                </div>
                <span style={{ color: "var(--primary)", fontSize: 22 }}>⚡</span>
              </div>
            </Card>
          )}

          {worker?.bio && (
            <Card style={{ marginBottom: 16 }}>
              <SectionLabel>Sobre mim</SectionLabel>
              <p style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.65, margin: 0 }}>{worker.bio}</p>
            </Card>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              width: "100%", padding: "0.75rem", borderRadius: "0.75rem",
              background: "var(--bg-card)", color: "var(--text-muted)",
              border: "1px solid var(--border)", fontWeight: 600, cursor: "pointer",
            }}>
            ← Sair da conta
          </button>
        </>
      )}
    </div>
  )
}
