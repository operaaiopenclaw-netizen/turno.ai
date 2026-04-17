"use client"
// src/app/admin/panel.tsx
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

type Tab = "companies" | "disputes" | "metrics"

export interface AdminCompany {
  id:           string
  tradeName:    string
  legalName:    string
  cnpj:         string
  industry:     string
  neighborhood: string
  verified:     boolean
  createdAt:    string
  ownerName:    string
  ownerEmail:   string
}

export interface AdminDispute {
  id:          string
  createdAt:   string
  disputeNote: string | null
  hoursWorked: number | null
  workerName:  string
  workerEmail: string
  companyName: string
  shiftRole:   string
  shiftDate:   string
  totalPay:    number
}

export interface AdminMetrics {
  users:         number
  workers:       number
  companies:     number
  shifts:        number
  payments:      number
  totalVolume:   string
  totalPlatform: string
}

export function AdminPanel({
  companies, disputes, metrics,
}: {
  companies: AdminCompany[]
  disputes:  AdminDispute[]
  metrics:   AdminMetrics
}) {
  const [tab, setTab]             = useState<Tab>("companies")
  const [busyId, setBusyId]       = useState<string | null>(null)
  const [message, setMessage]     = useState<string | null>(null)
  const [, startTransition]       = useTransition()
  const router                    = useRouter()

  async function verifyCompany(id: string) {
    if (!confirm("Confirmar verificação desta empresa?")) return
    setBusyId(id)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/companies/${id}`, { method: "PATCH" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Erro")
      setMessage("Empresa verificada com sucesso")
      startTransition(() => router.refresh())
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function resolveDispute(id: string) {
    const action = window.prompt(
      "Digite 'approve' para aprovar o timesheet ou 'reject' para devolver para revisão:",
      "approve",
    )
    if (action !== "approve" && action !== "reject") {
      if (action !== null) setMessage("Ação inválida. Use 'approve' ou 'reject'.")
      return
    }
    const resolvedNote = window.prompt("Nota de resolução (obrigatória):", "")
    if (!resolvedNote || !resolvedNote.trim()) {
      setMessage("Nota de resolução obrigatória")
      return
    }
    setBusyId(id)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/timesheets/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, resolvedNote }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Erro")
      setMessage(`Disputa ${action === "approve" ? "aprovada" : "rejeitada"} com sucesso`)
      startTransition(() => router.refresh())
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
            Turno<span style={{ color: "var(--primary)" }}>.</span> Admin
          </div>
          <div style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 4 }}>
            Painel operacional · Curitiba Beta
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex", gap: 4,
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            borderRadius: 10, padding: 4, marginBottom: 20, width: "fit-content",
          }}
        >
          {(
            [
              ["companies", `Empresas (${companies.length})`],
              ["disputes",  `Disputas (${disputes.length})`],
              ["metrics",   "Métricas"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: tab === key ? "var(--primary)" : "transparent",
                color:      tab === key ? "#000"           : "var(--txt-2)",
                border: "none", cursor: "pointer", transition: "all .15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {message && (
          <div
            style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: 13,
              background: "var(--purple-dim)", color: "#fff",
              border: "0.5px solid rgba(124,131,253,0.3)",
            }}
          >
            {message}
          </div>
        )}

        {tab === "companies" && (
          <CompaniesTab
            companies={companies}
            onVerify={verifyCompany}
            busyId={busyId}
          />
        )}

        {tab === "disputes" && (
          <DisputesTab
            disputes={disputes}
            onResolve={resolveDispute}
            busyId={busyId}
          />
        )}

        {tab === "metrics" && <MetricsTab metrics={metrics} />}

        <div style={{ marginTop: 24, fontSize: 12, color: "var(--txt-3)", textAlign: "center" }}>
          <Link href="/" style={{ color: "var(--primary)" }}>← Voltar ao início</Link>
        </div>
      </div>
    </div>
  )
}

// ─── COMPANIES ──────────────────────────────────────────────────────────────

function CompaniesTab({
  companies, onVerify, busyId,
}: {
  companies: AdminCompany[]
  onVerify:  (id: string) => void
  busyId:    string | null
}) {
  if (companies.length === 0) {
    return <EmptyCard>Nenhuma empresa cadastrada ainda.</EmptyCard>
  }
  return (
    <div
      style={{
        background: "var(--surface)", border: "0.5px solid var(--border)",
        borderRadius: 12, padding: 16, overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {["Empresa", "CNPJ", "Responsável", "Bairro", "Status", "Ação"].map(h => (
              <th
                key={h}
                style={{
                  textAlign: "left", padding: "10px", fontSize: 10, letterSpacing: 1,
                  textTransform: "uppercase", color: "var(--txt-3)",
                  borderBottom: "0.5px solid var(--border)",
                }}
              >{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {companies.map(c => (
            <tr key={c.id} style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}>
              <td style={{ padding: "12px 10px" }}>
                <div style={{ color: "#fff", fontWeight: 600 }}>{c.tradeName}</div>
                <div style={{ color: "var(--txt-3)", fontSize: 11 }}>{c.legalName}</div>
              </td>
              <td style={{ padding: "12px 10px", color: "var(--txt-2)", fontFamily: "monospace", fontSize: 12 }}>
                {c.cnpj}
              </td>
              <td style={{ padding: "12px 10px", color: "var(--txt-2)" }}>
                <div>{c.ownerName}</div>
                <div style={{ fontSize: 11, color: "var(--txt-3)" }}>{c.ownerEmail}</div>
              </td>
              <td style={{ padding: "12px 10px", color: "var(--txt-2)" }}>{c.neighborhood || "—"}</td>
              <td style={{ padding: "12px 10px" }}>
                <span
                  style={{
                    background:   c.verified ? "var(--primary-dim)" : "rgba(255,159,67,0.18)",
                    color:        c.verified ? "var(--primary)"      : "var(--orange)",
                    borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
                  }}
                >
                  {c.verified ? "Verificada" : "Pendente"}
                </span>
              </td>
              <td style={{ padding: "12px 10px" }}>
                {c.verified ? (
                  <span style={{ fontSize: 12, color: "var(--txt-3)" }}>✓ ok</span>
                ) : (
                  <button
                    disabled={busyId === c.id}
                    onClick={() => onVerify(c.id)}
                    style={{
                      background:   "var(--primary)", color: "#000",
                      border: "none", borderRadius: 8,
                      padding: "6px 12px", fontSize: 12, fontWeight: 700,
                      cursor: busyId === c.id ? "wait" : "pointer",
                      opacity: busyId === c.id ? 0.6 : 1,
                    }}
                  >
                    {busyId === c.id ? "..." : "Verificar"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── DISPUTES ───────────────────────────────────────────────────────────────

function DisputesTab({
  disputes, onResolve, busyId,
}: {
  disputes:  AdminDispute[]
  onResolve: (id: string) => void
  busyId:    string | null
}) {
  if (disputes.length === 0) {
    return <EmptyCard>Nenhuma disputa aberta. 🎉</EmptyCard>
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {disputes.map(d => (
        <div
          key={d.id}
          style={{
            background: "var(--surface)", border: "0.5px solid var(--border)",
            borderRadius: 12, padding: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                {d.shiftRole} · {d.companyName}
              </div>
              <div style={{ color: "var(--txt-2)", fontSize: 12, marginTop: 2 }}>
                Worker: {d.workerName} ({d.workerEmail})
              </div>
              <div style={{ color: "var(--txt-3)", fontSize: 11, marginTop: 2 }}>
                Data turno: {new Date(d.shiftDate).toLocaleDateString("pt-BR")} ·
                {" "}Horas: {d.hoursWorked ?? "—"}h ·
                {" "}Pagamento: {formatCurrency(d.totalPay)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <button
                disabled={busyId === d.id}
                onClick={() => onResolve(d.id)}
                style={{
                  background: "var(--orange)", color: "#000",
                  border: "none", borderRadius: 8,
                  padding: "8px 14px", fontSize: 12, fontWeight: 700,
                  cursor: busyId === d.id ? "wait" : "pointer",
                  opacity: busyId === d.id ? 0.6 : 1,
                }}
              >
                {busyId === d.id ? "Processando..." : "Resolver"}
              </button>
            </div>
          </div>

          {d.disputeNote && (
            <div
              style={{
                marginTop: 12, padding: "10px 12px",
                background: "rgba(255,107,107,0.08)",
                border: "0.5px solid rgba(255,107,107,0.25)",
                borderRadius: 10, fontSize: 12, color: "var(--txt)",
              }}
            >
              <span style={{ color: "var(--red, #ff6b6b)", fontWeight: 700 }}>Nota da empresa: </span>
              {d.disputeNote}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── METRICS ────────────────────────────────────────────────────────────────

function MetricsTab({ metrics }: { metrics: AdminMetrics }) {
  const cards: { label: string; value: string | number; color: string }[] = [
    { label: "Usuários totais",  value: metrics.users,         color: "#fff" },
    { label: "Trabalhadores",    value: metrics.workers,       color: "var(--primary)" },
    { label: "Empresas",         value: metrics.companies,     color: "var(--orange)" },
    { label: "Turnos",           value: metrics.shifts,        color: "#fff" },
    { label: "Pagamentos",       value: metrics.payments,      color: "var(--purple)" },
    { label: "Volume total",     value: metrics.totalVolume,   color: "var(--primary)" },
    { label: "Receita plataforma", value: metrics.totalPlatform, color: "var(--primary)" },
  ]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {cards.map(c => (
        <div
          key={c.label}
          style={{
            background: "var(--surface)", border: "0.5px solid var(--border)",
            borderRadius: 12, padding: "18px 14px", textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 22, fontWeight: 800, color: c.color,
              letterSpacing: -0.5, marginBottom: 4,
            }}
          >
            {c.value}
          </div>
          <div style={{ fontSize: 11, color: "var(--txt-2)" }}>{c.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── MISC ───────────────────────────────────────────────────────────────────

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)", border: "0.5px solid var(--border)",
        borderRadius: 12, padding: "36px 16px",
        textAlign: "center", color: "var(--txt-2)", fontSize: 14,
      }}
    >
      {children}
    </div>
  )
}
