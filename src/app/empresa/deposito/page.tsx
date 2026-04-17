"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

interface Balance { available: number; reserved: number; totalIn: number; totalOut: number }
interface Tx { id: string; type: string; amount: number; netAmount: number; status: string; description: string; reference?: string; createdAt: string }
interface DepositResult { walletTxId: string; qrCode: string; pixKey: string; amount: number; expiresAt: string }

const AMOUNTS = [500, 1000, 2000, 5000]

export default function DepositoPage() {
  const { data: session } = useSession()

  const [balance, setBalance]             = useState<Balance | null>(null)
  const [txs, setTxs]                     = useState<Tx[]>([])
  const [loading, setLoading]             = useState(true)
  const [amount, setAmount]               = useState("")
  const [step, setStep]                   = useState<"form" | "qr" | "confirmed">("form")
  const [depositData, setDepositData]     = useState<DepositResult | null>(null)
  const [processing, setProcessing]       = useState(false)
  const [msg, setMsg]                     = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmTxId, setConfirmTxId]     = useState("")

  const load = useCallback(async () => {
    const r = await fetch("/api/wallet")
    if (!r.ok) return
    const d = await r.json()
    setBalance(d.balance)
    setTxs(d.transactions ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toast = (text: string, ok: boolean) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3500)
  }

  async function handleDeposit() {
    const value = parseFloat(amount)
    if (!value || value < 10) return toast("Depósito mínimo R$ 10,00", false)

    setProcessing(true)
    const r = await fetch("/api/wallet", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ amount: value }),
    })
    setProcessing(false)
    if (r.ok) {
      const d = await r.json()
      setDepositData(d)
      setConfirmTxId(d.walletTxId)
      setStep("qr")
    } else {
      const d = await r.json()
      toast(d.error ?? "Erro ao gerar QR", false)
    }
  }

  // Em dev: simula confirmação do webhook
  async function handleDevConfirm() {
    setProcessing(true)
    const r = await fetch("/api/pix/webhook", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        transactionIdentification: confirmTxId,
        endToEndId: `E00507${Date.now()}`,
        status:     "PAID",
        amount:     depositData?.amount,
      }),
    })
    setProcessing(false)
    if (r.ok) {
      setStep("confirmed")
      load()
      toast("Depósito confirmado!", true)
    }
  }

  if (loading) {
    return (
      <div className="biz-layout">
        <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Carregando...</div>
      </div>
    )
  }

  return (
    <div className="biz-layout">
      {msg && (
        <div style={{
          position: "fixed", top: "1rem", left: "50%", transform: "translateX(-50%)",
          background: msg.ok ? "#22c55e" : "#ef4444",
          color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "0.75rem",
          zIndex: 1000, fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap",
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ maxWidth: "640px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>
          Carteira Turno
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Deposite BRL via PIX e pague trabalhadores instantaneamente
        </p>

        {/* Balance Summary */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem",
          marginBottom: "2rem",
        }}>
          <div className="metric-card" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Disponível</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>
              R$ {(balance?.available ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total depositado</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              R$ {(balance?.totalIn ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total pago</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              R$ {(balance?.totalOut ?? 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Deposit Flow */}
        {step === "form" && (
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1rem" }}>
              Novo depósito via PIX
            </div>

            {/* Quick amounts */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {AMOUNTS.map(a => (
                <button key={a}
                  onClick={() => setAmount(String(a))}
                  style={{
                    padding: "0.5rem 1rem", borderRadius: "0.5rem",
                    border: amount === String(a) ? "2px solid var(--primary)" : "1px solid var(--border)",
                    background: amount === String(a) ? "rgba(124,58,237,0.15)" : "var(--bg-input)",
                    color: "var(--text-primary)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                  }}>
                  R$ {a.toLocaleString("pt-BR")}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div style={{
              display: "flex", alignItems: "center",
              background: "var(--bg-input)", borderRadius: "0.5rem",
              padding: "0.75rem 1rem", marginBottom: "1rem",
            }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 700, marginRight: "0.5rem" }}>R$</span>
              <input
                type="number" step="0.01" min="10" placeholder="Outro valor"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: 700,
                }}
              />
            </div>

            <button
              onClick={handleDeposit}
              disabled={processing || !amount}
              style={{
                width: "100%", padding: "0.875rem", borderRadius: "0.75rem",
                background: processing ? "var(--bg-hover)" : "var(--primary)",
                color: "#fff", border: "none", fontWeight: 700, fontSize: "0.95rem",
                cursor: processing ? "not-allowed" : "pointer",
              }}>
              {processing ? "Gerando QR..." : "⚡ Gerar QR Code PIX"}
            </button>
          </div>
        )}

        {step === "qr" && depositData && (
          <div className="card" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>
              Escaneie o QR Code
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Valor: <strong>R$ {depositData.amount.toFixed(2)}</strong> · Expira em 30 min
            </p>

            {/* QR Code visual placeholder */}
            <div style={{
              width: "180px", height: "180px", margin: "0 auto 1rem",
              background: "#fff", borderRadius: "0.75rem", padding: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "3px solid var(--primary)",
            }}>
              <div style={{ fontSize: "0.6rem", fontFamily: "monospace", wordBreak: "break-all", color: "#000", textAlign: "left", lineHeight: 1.3 }}>
                {depositData.qrCode.slice(0, 80)}...
              </div>
            </div>

            {/* Copy PIX key */}
            <div style={{
              background: "var(--bg-input)", borderRadius: "0.5rem",
              padding: "0.75rem 1rem", marginBottom: "1rem",
            }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Ou pague via chave PIX
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{depositData.pixKey}</div>
            </div>

            <button
              onClick={() => { navigator.clipboard.writeText(depositData.qrCode); toast("QR Code copiado!", true) }}
              style={{
                width: "100%", padding: "0.75rem", borderRadius: "0.75rem",
                background: "var(--bg-card)", color: "var(--text-primary)",
                border: "1px solid var(--border)", fontWeight: 600, fontSize: "0.9rem",
                cursor: "pointer", marginBottom: "0.75rem",
              }}>
              📋 Copiar código PIX
            </button>

            {/* Dev confirmation button */}
            <button
              onClick={handleDevConfirm}
              disabled={processing}
              style={{
                width: "100%", padding: "0.875rem", borderRadius: "0.75rem",
                background: "#22c55e", color: "#fff",
                border: "none", fontWeight: 700, fontSize: "0.95rem",
                cursor: processing ? "not-allowed" : "pointer",
              }}>
              {processing ? "Confirmando..." : "✅ Simular confirmação (DEV)"}
            </button>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Em produção o saldo é creditado automaticamente após confirmação do Pix
            </p>
          </div>
        )}

        {step === "confirmed" && (
          <div className="card" style={{ textAlign: "center", marginBottom: "1.5rem", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              Depósito confirmado!
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              R$ {depositData?.amount.toFixed(2)} disponíveis na sua carteira
            </p>
            <button
              onClick={() => { setStep("form"); setAmount(""); setDepositData(null) }}
              style={{
                padding: "0.75rem 1.5rem", borderRadius: "0.75rem",
                background: "var(--primary)", color: "#fff",
                border: "none", fontWeight: 700, cursor: "pointer",
              }}>
              Novo depósito
            </button>
          </div>
        )}

        {/* Transaction history */}
        <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Histórico</div>
        {txs.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Nenhuma transação ainda</p>
        ) : (
          <div className="card">
            {txs.map((tx, i) => {
              const isIn = ["DEPOSIT_PIX", "DEPOSIT_BOLETO"].includes(tx.type)
              return (
                <div key={tx.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.875rem 0",
                  borderBottom: i < txs.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {tx.type === "DEPOSIT_PIX" ? "Depósito PIX" :
                       tx.type === "ESCROW_RELEASE" ? "Pagamento worker" :
                       tx.type === "ESCROW_LOCK" ? "Reserva turno" : tx.type}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {tx.description ?? "—"} · {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 700, fontSize: "0.95rem",
                    color: isIn ? "#22c55e" : "#ef4444",
                  }}>
                    {isIn ? "+" : "−"}R$ {Math.abs(Number(tx.netAmount)).toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
