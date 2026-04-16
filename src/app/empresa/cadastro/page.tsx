"use client"
// src/app/empresa/cadastro/page.tsx
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input, Card, Select, Textarea } from "@/components/ui"
import { CURITIBA_NEIGHBORHOODS } from "@/lib/utils"
import { INDUSTRY_LABELS } from "@/types"

const INDUSTRIES = (Object.entries(INDUSTRY_LABELS) as [string, string][]).map(([value, label]) => ({ value, label }))
const PIX_TYPES  = [
  { value: "CNPJ",   label: "CNPJ" },
  { value: "EMAIL",  label: "Email" },
  { value: "PHONE",  label: "Celular" },
  { value: "RANDOM", label: "Chave aleatória" },
]

export default function EmpresaCadastroPage() {
  const router = useRouter()
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [form,    setForm]    = useState({
    name: "", email: "", password: "",
    cnpj: "", tradeName: "", legalName: "",
    phone: "", address: "", neighborhood: "",
    industry: "HOSPITALITY",
    pixKey: "", pixKeyType: "EMAIL",
  })

  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const nbOpts = CURITIBA_NEIGHBORHOODS.map(n => ({ value: n, label: n }))

  async function submit() {
    setLoading(true)
    setError("")
    try {
      const res  = await fetch("/api/companies", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, legalName: form.legalName || form.tradeName }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Erro ao cadastrar"); setLoading(false); return }

      await signIn("credentials", { email: form.email, password: form.password, redirect: false })
      router.push("/empresa")
    } catch {
      setError("Erro de conexão")
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 20px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/">
            <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
              Turno<span style={{ color: "var(--primary)" }}>.</span>
            </span>
          </Link>
          <div style={{ fontSize: 14, color: "var(--txt-2)", marginTop: 8 }}>Cadastrar empresa</div>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, justifyContent: "center" }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: step >= s ? 28 : 8, height: 4, borderRadius: 2,
              background: step >= s ? "var(--primary)" : "var(--border-2)",
              transition: "all .3s",
            }} />
          ))}
        </div>

        <Card>
          {/* Step 1 — Account */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="label" style={{ marginBottom: 12 }}>Passo 1 — Acesso</div>
              <Input label="Responsável *" value={form.name}     onChange={e => setF("name",     e.target.value)} placeholder="Nome do responsável" />
              <Input label="Email *"       type="email" value={form.email}    onChange={e => setF("email",    e.target.value)} placeholder="rh@suaempresa.com.br" />
              <Input label="Senha *"       type="password" value={form.password} onChange={e => setF("password", e.target.value)} placeholder="Mínimo 6 caracteres" />
              <Input label="CNPJ *"        value={form.cnpj}     onChange={e => setF("cnpj",     e.target.value)} placeholder="00.000.000/0001-00" />
              <div style={{ marginTop: 8 }}>
                <Button full onClick={() => setStep(2)} disabled={!form.name || !form.email || !form.password || !form.cnpj}>
                  Próximo →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Company details */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="label" style={{ marginBottom: 12 }}>Passo 2 — Dados da empresa</div>
              <Input label="Nome fantasia *"   value={form.tradeName}    onChange={e => setF("tradeName",    e.target.value)} placeholder="Ex: Cervejaria Bodebrown" />
              <Input label="Razão social"       value={form.legalName}    onChange={e => setF("legalName",    e.target.value)} placeholder="Razão social completa (opcional)" />
              <Input label="Telefone *"         type="tel" value={form.phone}        onChange={e => setF("phone",        e.target.value)} placeholder="(41) 99999-0000" />
              <Select label="Setor *"           value={form.industry}     onChange={e => setF("industry",     e.target.value)} options={INDUSTRIES} />
              <Select label="Bairro *"          value={form.neighborhood} onChange={e => setF("neighborhood", e.target.value)} options={nbOpts} />
              <Input label="Endereço"            value={form.address}      onChange={e => setF("address",      e.target.value)} placeholder="Rua, número" />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Button variant="secondary" onClick={() => setStep(1)}>← Voltar</Button>
                <Button full onClick={() => setStep(3)} disabled={!form.tradeName || !form.phone || !form.neighborhood}>
                  Próximo →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Pix */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="label" style={{ marginBottom: 12 }}>Passo 3 — Pagamentos</div>
              <div style={{
                padding: "12px 16px",
                background: "var(--primary-dim)",
                border: "0.5px solid rgba(0,207,164,0.25)",
                borderRadius: 9,
                fontSize: 12,
                color: "var(--txt-2)",
                lineHeight: 1.6,
                marginBottom: 16,
              }}>
                💡 A taxa da plataforma (18%) é cobrada diretamente via Pix após aprovação de cada timesheet.
              </div>
              <Select label="Tipo de chave Pix" value={form.pixKeyType} onChange={e => setF("pixKeyType", e.target.value)} options={PIX_TYPES} />
              <Input
                label="Chave Pix"
                value={form.pixKey}
                onChange={e => setF("pixKey", e.target.value)}
                placeholder="Para receber reembolsos (opcional)"
              />

              {error && (
                <div style={{
                  padding: "10px 14px",
                  background: "var(--red-dim)",
                  border: "0.5px solid rgba(255,107,107,0.3)",
                  borderRadius: 9,
                  fontSize: 13,
                  color: "var(--red)",
                  marginBottom: 8,
                }}>{error}</div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
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
