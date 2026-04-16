"use client"
// src/app/empresa/pagamento/page.tsx
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Payment } from "@/types"
import { Card, Spinner, EmptyState, SectionLabel, InfoRow, Divider } from "@/components/ui"
import { Button } from "@/components/ui/Button"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export default function PagamentoPage() {
  const searchParams  = useSearchParams()
  const timesheetId   = searchParams.get("timesheetId")
  const [payments,  setPayments]  = useState<Payment[]>([])
  const [pendingTs, setPendingTs] = useState<any | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [paying,    setPaying]    = useState<string | null>(null)
  const [toast,     setToast]     = useState("")
  const [expanded,  setExpanded]  = useState<string | null>(timesheetId ?? null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [paymentsRes, tsRes] = await Promise.all([
        fetch("/api/payments"),
        timesheetId ? fetch(`/api/timesheet/${timesheetId}`) : Promise.resolve(null),
      ])
      const paymentsJson = await paymentsRes.json()
      setPayments(paymentsJson.data ?? [])

      if (tsRes) {
        const tsJson = await tsRes.json()
        const ts = tsJson.data
        // Only show as pending if approved and no payment yet
        const alreadyPaid = (paymentsJson.data ?? []).some((p: Payment) => p.timesheetId === timesheetId)
        if (ts && ts.status === "APPROVED" && !alreadyPaid) setPendingTs(ts)
      }
      setLoading(false)
    }
    load()
  }, [timesheetId])

  async function processPayment(timesheetId: string) {
    setPaying(timesheetId)
    const res  = await fetch("/api/payments", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ timesheetId }),
    })
    const json = await res.json()
    if (res.ok) {
      setPayments(prev => {
        const exists = prev.find(p => p.timesheetId === timesheetId)
        if (exists) return prev.map(p => p.timesheetId === timesheetId ? { ...p, ...json.data } : p)
        return [json.data, ...prev]
      })
      setToast("⚡ Pix enviado com sucesso!")
      setTimeout(() => setToast(""), 4000)
    } else {
      setToast(json.error ?? "Erro no pagamento")
    }
    setPaying(null)
  }

  const total = payments.filter(p => p.status === "PAID").reduce((sum, p) => sum + p.netAmount, 0)
  const fees  = payments.filter(p => p.status === "PAID").reduce((sum, p) => sum + p.platformFee, 0)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Pagamentos</h1>
        <p style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 2 }}>
          Pix automático + registro imutável na blockchain
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Total pago",   value: formatCurrency(total), color: "var(--primary)" },
          { label: "Taxa Turno",   value: formatCurrency(fees),  color: "var(--txt)" },
          { label: "Transações",   value: payments.filter(p => p.status === "PAID").length, color: "var(--txt)" },
        ].map(m => (
          <div key={m.label} className="metric-card">
            <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
            <div className="metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Blockchain info banner */}
      <div style={{
        background: "var(--purple-dim)",
        border: "0.5px solid rgba(124,131,253,0.25)",
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>⛓</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Registro blockchain ativo</div>
          <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>
            Cada pagamento é registrado imutavelmente na rede Polygon. Hash disponível após confirmação.
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
          <Spinner />
        </div>
      ) : payments.length === 0 && !pendingTs ? (
        <EmptyState
          icon="💰"
          title="Nenhum pagamento ainda"
          desc="Pagamentos aparecerão aqui após aprovação dos timesheets."
        />
      ) : (
        <>
        {/* Pending timesheet ready to pay — arrived from timesheet approve redirect */}
        {pendingTs && (
          <Card style={{ marginBottom: 16, border: "0.5px solid rgba(0,207,164,0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  {pendingTs.worker?.user?.name ?? "Trabalhador"}
                </div>
                <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 2 }}>
                  {pendingTs.shift?.role} · {pendingTs.hoursWorked ?? 0}h trabalhadas
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>
                  {formatCurrency((pendingTs.shift?.totalPay ?? 0) * 0.82)}
                </div>
                <div style={{ fontSize: 10, color: "var(--txt-3)" }}>líquido trabalhador</div>
              </div>
            </div>
            <div style={{
              padding: "10px 14px",
              background: "var(--primary-dim)",
              borderRadius: 9,
              fontSize: 12,
              color: "var(--txt-2)",
              marginBottom: 14,
              lineHeight: 1.6,
            }}>
              💡 Taxa Turno (18%): {formatCurrency((pendingTs.shift?.totalPay ?? 0) * 0.18)} ·
              Total cobrado: {formatCurrency(pendingTs.shift?.totalPay ?? 0)}
            </div>
            <Button
              full
              loading={paying === pendingTs.id}
              onClick={async () => {
                setPaying(pendingTs.id)
                const res  = await fetch("/api/payments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ timesheetId: pendingTs.id }),
                })
                const json = await res.json()
                if (res.ok) {
                  setPayments(prev => [json.data, ...prev])
                  setPendingTs(null)
                  setToast("⚡ Pix enviado com sucesso!")
                  setTimeout(() => setToast(""), 4000)
                } else {
                  setToast(json.error ?? "Erro no pagamento")
                }
                setPaying(null)
              }}
            >
              ⚡ Enviar pagamento via Pix
            </Button>
          </Card>
        )}
        {payments.map(p => {
          const isOpen = expanded === p.id || expanded === p.timesheetId
          const workerName = (p as any).application?.worker?.user?.name ?? "Trabalhador"
          const role       = (p as any).shift?.role ?? "Turno"

          return (
            <Card key={p.id} style={{
              marginBottom: 12,
              ...(p.status === "PAID" ? { border: "0.5px solid rgba(0,207,164,0.25)" } : {}),
            }}>
              {/* Header row */}
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => setExpanded(isOpen ? null : p.id)}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 40, height: 40,
                    borderRadius: "50%",
                    background: p.status === "PAID" ? "var(--primary-dim)" : "var(--surface-2)",
                    border: `1.5px solid ${p.status === "PAID" ? "rgba(0,207,164,0.4)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>
                    {p.status === "PAID" ? "⚡" : p.status === "PROCESSING" ? "⏳" : "💰"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{workerName}</div>
                    <div style={{ fontSize: 12, color: "var(--txt-2)", marginTop: 1 }}>{role}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>
                    {formatCurrency(p.netAmount)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--txt-3)", marginTop: 2 }}>
                    {p.status === "PAID" ? "Pago ✓" : p.status === "PROCESSING" ? "Processando..." : "Pendente"}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div style={{ marginTop: 16 }}>
                  <Divider />
                  <div style={{ marginBottom: 14 }}>
                    <InfoRow label="Valor trabalhador" value={formatCurrency(p.netAmount)} valueColor="var(--primary)" />
                    <InfoRow label="Taxa plataforma (18%)" value={formatCurrency(p.platformFee)} />
                    <InfoRow label="Total cobrado" value={formatCurrency(p.amount)} />
                    {p.pixKey && <InfoRow label="Chave Pix destino" value={p.pixKey} />}
                    {p.paidAt && <InfoRow label="Pago em" value={formatDateTime(p.paidAt)} />}
                  </div>

                  {p.status === "PAID" && p.pixE2eId && (
                    <div style={{
                      padding: "12px 14px",
                      background: "var(--primary-dim)",
                      border: "0.5px solid rgba(0,207,164,0.25)",
                      borderRadius: 9,
                      marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 10, color: "var(--txt-3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
                        Comprovante Pix
                      </div>
                      <div style={{ fontSize: 11, color: "var(--primary)", fontFamily: "monospace", wordBreak: "break-all" }}>
                        {p.pixE2eId}
                      </div>
                    </div>
                  )}

                  {p.status === "PAID" && p.blockchainTxHash && (
                    <div style={{
                      padding: "12px 14px",
                      background: "var(--purple-dim)",
                      border: "0.5px solid rgba(124,131,253,0.25)",
                      borderRadius: 9,
                      marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 10, color: "var(--txt-3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
                        ⛓ Registro Blockchain — Polygon
                      </div>
                      <div style={{ fontSize: 11, color: "var(--purple)", fontFamily: "monospace", wordBreak: "break-all", marginBottom: 6 }}>
                        {p.blockchainTxHash}
                      </div>
                      {p.blockchainBlock && (
                        <div style={{ fontSize: 11, color: "var(--txt-3)" }}>
                          Bloco #{p.blockchainBlock.toString()} · Confirmado ✓
                        </div>
                      )}
                      <a
                        href={`https://polygonscan.com/tx/${p.blockchainTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "var(--purple)", marginTop: 6, display: "inline-block" }}
                      >
                        Ver no Polygonscan →
                      </a>
                    </div>
                  )}

                  {p.status === "PENDING" && p.timesheetId && (
                    <Button
                      full
                      loading={paying === p.timesheetId}
                      onClick={() => processPayment(p.timesheetId!)}
                    >
                      ⚡ Enviar pagamento via Pix
                    </Button>
                  )}
                </div>
              )}

              {/* Quick pay for timesheet-linked pending */}
              {timesheetId && p.status === "PENDING" && p.timesheetId === timesheetId && !isOpen && (
                <div style={{ marginTop: 12 }}>
                  <Button
                    full
                    loading={paying === timesheetId}
                    onClick={() => processPayment(timesheetId)}
                  >
                    ⚡ Enviar pagamento via Pix
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
        </>
      )}

      {toast && (
        <div className="toast" style={{ color: toast.includes("⚡") ? "var(--primary)" : "var(--red)" }}>
          {toast}
        </div>
      )}
    </div>
  )
}
