"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

interface Balance { available: number; reserved: number; totalIn: number; totalOut: number }
interface Tx { id: string; type: string; amount: number; netAmount: number; status: string; description: string; createdAt: string }
interface VirtualCard { last4: string; expiryMonth: number; expiryYear: number; status: string; limitDaily: number; spentToday: number }

const TX_LABEL: Record<string, { label: string; color: string }> = {
  DEPOSIT_PIX:    { label: "Depósito PIX",     color: "text-green-400"  },
  ESCROW_RELEASE: { label: "Pagamento turno",  color: "text-green-400"  },
  CASHOUT_PIX:    { label: "Saque PIX",        color: "text-red-400"    },
  CARD_SPEND:     { label: "Gasto cartão",     color: "text-yellow-400" },
  CARD_REFUND:    { label: "Estorno cartão",   color: "text-green-400"  },
  ESCROW_LOCK:    { label: "Reserva escrow",   color: "text-gray-400"   },
}

export default function CarteiraPage() {
  const { data: session } = useSession()

  const [balance, setBalance]       = useState<Balance | null>(null)
  const [txs, setTxs]               = useState<Tx[]>([])
  const [card, setCard]             = useState<VirtualCard | null>(null)
  const [loading, setLoading]       = useState(true)
  const [cashoutAmt, setCashoutAmt] = useState("")
  const [tab, setTab]               = useState<"wallet" | "card">("wallet")
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null)
  const [processing, setProcessing] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch("/api/wallet")
    if (!r.ok) return
    const d = await r.json()
    setBalance(d.balance)
    setTxs(d.transactions ?? [])
    setCard(d.virtualCard)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toast = (text: string, ok: boolean) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3500)
  }

  async function handleCashout() {
    const amount = parseFloat(cashoutAmt)
    if (!amount || amount < 5) return toast("Saque mínimo R$ 5,00", false)
    if (!balance || amount > balance.available) return toast("Saldo insuficiente", false)

    setProcessing(true)
    const r = await fetch("/api/wallet/cashout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ amount }),
    })
    setProcessing(false)
    if (r.ok) {
      toast("Saque enviado com sucesso!", true)
      setCashoutAmt("")
      load()
    } else {
      const d = await r.json()
      toast(d.error ?? "Erro ao sacar", false)
    }
  }

  async function handleRequestCard() {
    setProcessing(true)
    const r = await fetch("/api/wallet/card", { method: "POST" })
    setProcessing(false)
    if (r.ok) {
      toast("Cartão virtual emitido!", true)
      load()
    } else {
      const d = await r.json()
      toast(d.error ?? "Erro ao emitir cartão", false)
    }
  }

  const firstName = (session?.user?.name ?? "").split(" ")[0]

  if (loading) {
    return (
      <div className="worker-app">
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
          Carregando carteira...
        </div>
      </div>
    )
  }

  return (
    <div className="worker-app">
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

      {/* Header */}
      <div style={{ padding: "1.5rem 1rem 0" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>
          Carteira Turno
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Olá, {firstName} — seu saldo em BRLC
        </p>
      </div>

      {/* Balance Card */}
      <div style={{ padding: "1rem" }}>
        <div style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          borderRadius: "1rem", padding: "1.5rem", color: "#fff",
        }}>
          <div style={{ fontSize: "0.8rem", opacity: 0.8, marginBottom: "0.5rem" }}>
            Saldo disponível
          </div>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            R$ {(balance?.available ?? 0).toFixed(2).replace(".", ",")}
          </div>
          {(balance?.reserved ?? 0) > 0 && (
            <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
              + R$ {(balance?.reserved ?? 0).toFixed(2)} reservado em escrow
            </div>
          )}
          <div style={{
            display: "flex", gap: "1.5rem", marginTop: "1.25rem",
            borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "1rem",
          }}>
            <div>
              <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>Total recebido</div>
              <div style={{ fontWeight: 700 }}>R$ {(balance?.totalIn ?? 0).toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>Total sacado</div>
              <div style={{ fontWeight: 700 }}>R$ {(balance?.totalOut ?? 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 1rem", gap: "0.5rem", marginBottom: "1rem" }}>
        {(["wallet", "card"] as const).map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "0.6rem", borderRadius: "0.5rem", border: "none",
              background: tab === t ? "var(--primary)" : "var(--bg-card)",
              color: tab === t ? "#fff" : "var(--text-muted)",
              fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
            }}>
            {t === "wallet" ? "💸 Saque PIX" : "💳 Cartão Virtual"}
          </button>
        ))}
      </div>

      {tab === "wallet" && (
        <div style={{ padding: "0 1rem" }}>
          {/* Cashout */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ fontWeight: 700, marginBottom: "1rem" }}>Sacar para PIX</div>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              background: "var(--bg-input)", borderRadius: "0.5rem", padding: "0.75rem 1rem",
              marginBottom: "0.75rem",
            }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>R$</span>
              <input
                type="number" step="0.01" min="5" placeholder="0,00"
                value={cashoutAmt}
                onChange={e => setCashoutAmt(e.target.value)}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: 700,
                }}
              />
              <button
                onClick={() => setCashoutAmt(String((balance?.available ?? 0).toFixed(2)))}
                style={{
                  fontSize: "0.75rem", color: "var(--primary)", background: "none",
                  border: "none", cursor: "pointer", fontWeight: 600,
                }}>
                Tudo
              </button>
            </div>
            <button
              onClick={handleCashout}
              disabled={processing || !cashoutAmt}
              style={{
                width: "100%", padding: "0.875rem", borderRadius: "0.75rem",
                background: processing ? "var(--bg-hover)" : "var(--primary)",
                color: "#fff", border: "none", fontWeight: 700, fontSize: "0.95rem",
                cursor: processing ? "not-allowed" : "pointer",
              }}>
              {processing ? "Processando..." : "⚡ Sacar via PIX"}
            </button>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem", textAlign: "center" }}>
              PIX D+0 · instantâneo · sem custo
            </p>
          </div>

          {/* Transactions */}
          <div style={{ fontWeight: 700, marginBottom: "0.75rem", fontSize: "0.9rem" }}>
            Histórico
          </div>
          {txs.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem 0" }}>
              Nenhuma transação ainda
            </p>
          ) : (
            txs.map(tx => {
              const info = TX_LABEL[tx.type] ?? { label: tx.type, color: "text-gray-400" }
              const isCredit = ["DEPOSIT_PIX", "DEPOSIT_BOLETO", "ESCROW_RELEASE", "CARD_REFUND"].includes(tx.type)
              return (
                <div key={tx.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.875rem 0", borderBottom: "1px solid var(--border-subtle)",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{info.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {tx.description ?? "—"} · {new Date(tx.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 700,
                    color: isCredit ? "#22c55e" : "#ef4444",
                    fontSize: "0.95rem",
                  }}>
                    {isCredit ? "+" : "−"}R$ {Math.abs(Number(tx.netAmount)).toFixed(2)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === "card" && (
        <div style={{ padding: "0 1rem" }}>
          {card && card.status === "ACTIVE" ? (
            <>
              {/* Card Visual */}
              <div style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
                borderRadius: "1rem", padding: "1.5rem", color: "#fff",
                marginBottom: "1rem", position: "relative", overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(124,58,237,0.3)" }} />
                <div style={{ position: "absolute", bottom: "-30px", left: "30px", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(79,70,229,0.3)" }} />
                <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem", position: "relative" }}>
                  Turno Card
                </div>
                <div style={{ letterSpacing: "0.2em", fontSize: "1.1rem", marginBottom: "1rem", position: "relative" }}>
                  •••• •••• •••• {card.last4}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                  <div>
                    <div style={{ fontSize: "0.65rem", opacity: 0.6 }}>TITULAR</div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {(session?.user?.name ?? "").toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", opacity: 0.6 }}>VALIDADE</div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "-0.5rem", alignItems: "center" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#ef4444", opacity: 0.85 }} />
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#f97316", marginLeft: "-12px" }} />
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div className="card" style={{ marginBottom: "1rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Limites</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Saldo disponível</span>
                  <span style={{ fontWeight: 700 }}>R$ {(balance?.available ?? 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Limite diário</span>
                  <span style={{ fontWeight: 700 }}>R$ {Number(card.limitDaily).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Gasto hoje</span>
                  <span style={{ fontWeight: 700, color: Number(card.spentToday) > 0 ? "#f97316" : "inherit" }}>
                    R$ {Number(card.spentToday).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="card" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  💳 Use seu saldo Turno diretamente em qualquer estabelecimento que aceite cartão de crédito virtual.
                  Sem anuidade · Sem taxa de emissão · Saldo = dinheiro de turno.
                </p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💳</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                Cartão Virtual Turno
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                Use seu saldo de turnos diretamente como crédito virtual.
                Sem burocracia · Sem conta bancária · D+0.
              </p>
              <button
                onClick={handleRequestCard}
                disabled={processing}
                style={{
                  padding: "0.875rem 2rem", borderRadius: "0.75rem",
                  background: "var(--primary)", color: "#fff",
                  border: "none", fontWeight: 700, fontSize: "0.95rem",
                  cursor: processing ? "not-allowed" : "pointer",
                }}>
                {processing ? "Emitindo..." : "✨ Emitir cartão grátis"}
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ height: "5rem" }} />
    </div>
  )
}
