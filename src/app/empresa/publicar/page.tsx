"use client"
// src/app/empresa/publicar/page.tsx
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input, Textarea, Select, Card, SectionLabel } from "@/components/ui"
import { calcHours, formatCurrency, CURITIBA_NEIGHBORHOODS } from "@/lib/utils"
import { INDUSTRY_LABELS } from "@/types"

const ROLES = [
  "Garçom", "Garçonete", "Bartender", "Recepcionista", "Auxiliar de eventos",
  "Copeiro", "Atendente de bar", "Promoter", "Organizador de eventos",
  "Segurança", "Auxiliar de cozinha", "Manobrista", "Outro",
]

const CATEGORIES = (Object.entries(INDUSTRY_LABELS) as [string, string][])
  .filter(([v]) => ["HOSPITALITY", "EVENTS", "RETAIL"].includes(v))
  .map(([value, label]) => ({ value, label }))

export default function PublicarPage() {
  const router  = useRouter()
  const [step,  setStep]  = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [form,  setForm]  = useState({
    role: "", description: "", requirements: "", dresscode: "",
    date: "", startTime: "", endTime: "",
    totalPay: "", spots: "1",
    category: "HOSPITALITY", neighborhood: "", address: "",
    urgent: false,
  })

  const setF = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  const hours   = form.startTime && form.endTime ? calcHours(form.startTime, form.endTime) : 0
  const perHour = hours > 0 && form.totalPay ? parseFloat(form.totalPay) / hours : 0

  async function publish() {
    setLoading(true)
    setError("")
    const res  = await fetch("/api/shifts", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...form, totalPay: parseFloat(form.totalPay), spots: parseInt(form.spots) }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? "Erro ao publicar"); setLoading(false); return }
    router.push("/empresa")
  }

  const neighborhoods = CURITIBA_NEIGHBORHOODS.map(n => ({ value: n, label: n }))

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Publicar turno</h1>
        <p style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 2 }}>
          Trabalhadores qualificados em Curitiba serão notificados em minutos
        </p>
      </div>

      {/* Step progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
        {["Função & Data", "Pagamento", "Confirmar"].map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: step > i + 1 ? "var(--primary)" : step === i + 1 ? "var(--primary-dim)" : "var(--surface-2)",
                border: `1.5px solid ${step >= i + 1 ? "var(--primary)" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12,
                color: step > i + 1 ? "#001a12" : step === i + 1 ? "var(--primary)" : "var(--txt-3)",
                fontWeight: 700,
              }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 12,
                color: step === i + 1 ? "#fff" : "var(--txt-3)",
                fontWeight: step === i + 1 ? 600 : 400,
              }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: "0.5px", background: "var(--border)", margin: "0 10px" }} />}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 580 }}>
        <Card>
          {/* Step 1 */}
          {step === 1 && (
            <div>
              <SectionLabel>Função & horário</SectionLabel>
              <Select
                label="Função / Cargo *"
                value={form.role}
                onChange={e => setF("role", e.target.value)}
                options={ROLES.map(r => ({ value: r, label: r }))}
              />
              <Select
                label="Categoria *"
                value={form.category}
                onChange={e => setF("category", e.target.value)}
                options={CATEGORIES}
              />
              <Input
                label="Data do turno *"
                type="date"
                value={form.date}
                onChange={e => setF("date", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Início *" type="time" value={form.startTime} onChange={e => setF("startTime", e.target.value)} />
                <Input label="Término *" type="time" value={form.endTime} onChange={e => setF("endTime", e.target.value)} />
              </div>
              {hours > 0 && (
                <div style={{
                  padding: "10px 14px",
                  background: "var(--primary-dim)",
                  borderRadius: 9,
                  fontSize: 13,
                  color: "var(--primary)",
                  marginBottom: 16,
                }}>
                  ⏱ {hours}h de trabalho
                </div>
              )}
              <Select
                label="Bairro *"
                value={form.neighborhood}
                onChange={e => setF("neighborhood", e.target.value)}
                options={neighborhoods}
              />
              <Input label="Endereço completo" value={form.address} onChange={e => setF("address", e.target.value)} placeholder="Rua, número" />
              <Textarea
                label="Descrição do turno *"
                value={form.description}
                onChange={e => setF("description", e.target.value)}
                placeholder="Descreva o evento, o serviço esperado, quantidade de pessoas..."
              />
              <Textarea
                label="Requisitos (opcional)"
                value={form.requirements}
                onChange={e => setF("requirements", e.target.value)}
                placeholder="Experiência mínima, idiomas, certificações..."
              />
              <Input label="Dress code (opcional)" value={form.dresscode} onChange={e => setF("dresscode", e.target.value)} placeholder="Social escuro, preto casual..." />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <Button onClick={() => setStep(2)} disabled={!form.role || !form.date || !form.startTime || !form.endTime || !form.neighborhood || !form.description}>
                  Próximo →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <SectionLabel>Pagamento & vagas</SectionLabel>
              <Input
                label="Valor total por trabalhador (R$) *"
                type="number"
                value={form.totalPay}
                onChange={e => setF("totalPay", e.target.value)}
                placeholder="Ex: 150"
                hint={perHour > 0 ? `≈ R$ ${perHour.toFixed(2)}/hora` : undefined}
              />
              <Input
                label="Número de vagas *"
                type="number"
                value={form.spots}
                onChange={e => setF("spots", e.target.value)}
                min="1"
                max="50"
              />

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div
                  onClick={() => setF("urgent", !form.urgent)}
                  style={{
                    width: 38, height: 22,
                    background: form.urgent ? "var(--red)" : "var(--surface-3)",
                    borderRadius: 11,
                    position: "relative",
                    cursor: "pointer",
                    transition: "background .2s",
                    border: "0.5px solid var(--border-2)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: 3, left: form.urgent ? 19 : 3,
                    width: 14, height: 14,
                    background: "#fff",
                    borderRadius: "50%",
                    transition: "left .2s",
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#fff" }}>Marcar como urgente</div>
                  <div style={{ fontSize: 11, color: "var(--txt-3)" }}>Destaque extra no feed dos trabalhadores</div>
                </div>
              </div>

              {form.totalPay && (
                <div style={{
                  padding: "14px 16px",
                  background: "var(--surface-2)",
                  borderRadius: 9,
                  marginBottom: 16,
                }}>
                  <div className="label" style={{ marginBottom: 8 }}>Resumo financeiro</div>
                  {[
                    ["Por trabalhador",   formatCurrency(parseFloat(form.totalPay) || 0)],
                    ["Total (vagas)",     formatCurrency((parseFloat(form.totalPay) || 0) * (parseInt(form.spots) || 1))],
                    ["Taxa Turno (18%)",  formatCurrency((parseFloat(form.totalPay) || 0) * 0.18 * (parseInt(form.spots) || 1))],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                      <span style={{ color: "var(--txt-2)" }}>{k}</span>
                      <span style={{ color: "#fff", fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="secondary" onClick={() => setStep(1)}>← Voltar</Button>
                <Button full onClick={() => setStep(3)} disabled={!form.totalPay}>Revisar →</Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <SectionLabel>Confirme antes de publicar</SectionLabel>
              {[
                ["Função",         form.role],
                ["Categoria",      INDUSTRY_LABELS[form.category as keyof typeof INDUSTRY_LABELS] ?? form.category],
                ["Data",           form.date],
                ["Horário",        `${form.startTime} – ${form.endTime} (${hours}h)`],
                ["Pagamento",      `${formatCurrency(parseFloat(form.totalPay))} por pessoa`],
                ["Vagas",          form.spots],
                ["Bairro",         form.neighborhood],
                ["Urgente",        form.urgent ? "Sim" : "Não"],
              ].map(([k, v]) => (
                <div key={k as string} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "0.5px solid var(--border)",
                  fontSize: 13,
                }}>
                  <span style={{ color: "var(--txt-2)" }}>{k as string}</span>
                  <span style={{ color: "#fff", fontWeight: 500 }}>{v as string}</span>
                </div>
              ))}

              <div style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "var(--primary-dim)",
                border: "0.5px solid rgba(0,207,164,0.3)",
                borderRadius: 9,
                fontSize: 12,
                color: "var(--txt-2)",
                lineHeight: 1.6,
                marginBottom: 16,
              }}>
                💡 Trabalhadores do bairro <strong style={{ color: "#fff" }}>{form.neighborhood}</strong> e arredores serão notificados em até <strong style={{ color: "var(--primary)" }}>5 minutos</strong>.
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
                <Button full loading={loading} onClick={publish}>✓ Publicar agora</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
