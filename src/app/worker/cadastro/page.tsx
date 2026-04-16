"use client"
// src/app/worker/cadastro/page.tsx
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input, Card, Select } from "@/components/ui"
import { CURITIBA_NEIGHBORHOODS } from "@/lib/utils"

const SKILLS_OPTIONS = [
  "Garçom", "Garçonete", "Bartender", "Recepcionista", "Auxiliar de eventos",
  "Copeiro", "Cozinheiro", "Auxiliar de cozinha", "Sommelier", "Atendimento ao cliente",
  "Inglês básico", "Inglês fluente", "Espanhol", "Organização de eventos",
]

export default function WorkerRegisterPage() {
  const router = useRouter()
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [form,    setForm]    = useState({
    name: "", email: "", password: "", cpf: "", phone: "",
    pixKey: "", pixKeyType: "EMAIL",
    neighborhood: "", bio: "", skills: [] as string[],
  })

  const setF = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))
  const toggleSkill = (s: string) => setForm(prev => ({
    ...prev,
    skills: prev.skills.includes(s) ? prev.skills.filter(x => x !== s) : [...prev.skills, s],
  }))

  async function submit() {
    setLoading(true)
    setError("")
    try {
      const res  = await fetch("/api/workers", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Erro ao cadastrar"); setLoading(false); return }

      // Auto login
      await signIn("credentials", { email: form.email, password: form.password, redirect: false })
      router.push("/worker")
    } catch {
      setError("Erro de conexão")
      setLoading(false)
    }
  }

  const neighborhoods = CURITIBA_NEIGHBORHOODS.map(n => ({ value: n, label: n }))
  const pixTypes = [
    { value: "EMAIL",  label: "Email" },
    { value: "CPF",    label: "CPF" },
    { value: "PHONE",  label: "Celular" },
    { value: "RANDOM", label: "Chave aleatória" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 20px" }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/">
            <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
              Turno<span style={{ color: "var(--primary)" }}>.</span>
            </span>
          </Link>
          <div style={{ fontSize: 14, color: "var(--txt-2)", marginTop: 8 }}>
            Criar conta — Trabalhador
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, justifyContent: "center" }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: step >= s ? 28 : 8,
              height: 4,
              borderRadius: 2,
              background: step >= s ? "var(--primary)" : "var(--border-2)",
              transition: "all .3s",
            }} />
          ))}
        </div>

        <Card>
          {/* Step 1 — Personal info */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="label" style={{ marginBottom: 12 }}>Passo 1 — Dados pessoais</div>
              <Input label="Nome completo *" value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Ana Lima" />
              <Input label="Email *" type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="seu@email.com" />
              <Input label="Senha *" type="password" value={form.password} onChange={e => setF("password", e.target.value)} placeholder="Mínimo 6 caracteres" />
              <Input label="CPF *" value={form.cpf} onChange={e => setF("cpf", e.target.value)} placeholder="000.000.000-00" />
              <Input label="Celular *" type="tel" value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="(41) 99999-0000" />
              <div style={{ marginTop: 8 }}>
                <Button full onClick={() => setStep(2)} disabled={!form.name || !form.email || !form.password || !form.cpf || !form.phone}>
                  Próximo →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Pix + neighborhood */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="label" style={{ marginBottom: 12 }}>Passo 2 — Pix e localização</div>
              <Select
                label="Tipo de chave Pix *"
                value={form.pixKeyType}
                onChange={e => setF("pixKeyType", e.target.value)}
                options={pixTypes}
              />
              <Input
                label="Chave Pix *"
                value={form.pixKey}
                onChange={e => setF("pixKey", e.target.value)}
                placeholder={form.pixKeyType === "EMAIL" ? "seu@email.com" : form.pixKeyType === "CPF" ? "000.000.000-00" : "(41) 99999-0000"}
                hint="Pagamentos serão enviados para esta chave após cada turno"
              />
              <Select
                label="Bairro em Curitiba *"
                value={form.neighborhood}
                onChange={e => setF("neighborhood", e.target.value)}
                options={neighborhoods}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Button variant="secondary" onClick={() => setStep(1)}>← Voltar</Button>
                <Button full onClick={() => setStep(3)} disabled={!form.pixKey || !form.neighborhood}>Próximo →</Button>
              </div>
            </div>
          )}

          {/* Step 3 — Skills */}
          {step === 3 && (
            <div>
              <div className="label" style={{ marginBottom: 12 }}>Passo 3 — Habilidades</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {SKILLS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSkill(s)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      border: `0.5px solid ${form.skills.includes(s) ? "var(--primary)" : "var(--border-2)"}`,
                      background: form.skills.includes(s) ? "var(--primary-dim)" : "transparent",
                      color: form.skills.includes(s) ? "var(--primary)" : "var(--txt-2)",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all .15s",
                    }}
                  >{s}</button>
                ))}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Bio (opcional)</label>
                <textarea
                  value={form.bio}
                  onChange={e => setF("bio", e.target.value)}
                  placeholder="Conte um pouco sobre sua experiência..."
                  rows={3}
                  style={{ marginTop: 6 }}
                />
              </div>

              {error && (
                <div style={{
                  padding: "10px 14px",
                  background: "var(--red-dim)",
                  border: "0.5px solid rgba(255,107,107,0.3)",
                  borderRadius: 9,
                  fontSize: 13,
                  color: "var(--red)",
                  marginBottom: 16,
                }}>{error}</div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="secondary" onClick={() => setStep(2)}>← Voltar</Button>
                <Button full loading={loading} onClick={submit}>Criar conta ✓</Button>
              </div>
            </div>
          )}
        </Card>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--txt-3)" }}>
          Já tem conta?{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>Entrar</Link>
        </p>
      </div>
    </div>
  )
}
