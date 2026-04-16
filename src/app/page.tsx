"use client"
// src/app/page.tsx
import Link from "next/link"

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48,
            background: "var(--primary-dim)",
            border: "1px solid rgba(0,207,164,0.3)",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>⚡</div>
          <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: -1.5 }}>
            Turno<span style={{ color: "var(--primary)" }}>.</span>
          </span>
        </div>
        <p style={{ color: "var(--txt-2)", fontSize: 14, marginTop: 4 }}>
          Trabalho por turno — Curitiba · Beta
        </p>
      </div>

      {/* Role selection */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        width: "100%",
        maxWidth: 440,
        marginBottom: 40,
      }}>
        {/* Worker */}
        <Link href="/worker/cadastro" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-2)",
            borderRadius: 16,
            padding: "36px 20px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all .15s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"
              ;(e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-2)"
              ;(e.currentTarget as HTMLElement).style.transform = "translateY(0)"
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 16 }}>🧑‍🍳</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Quero trabalhar
            </div>
            <div style={{ fontSize: 12, color: "var(--txt-2)", lineHeight: 1.5 }}>
              Encontre turnos perto de você hoje
            </div>
          </div>
        </Link>

        {/* Company */}
        <Link href="/empresa/cadastro" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--primary-dim)",
            border: "1px solid rgba(0,207,164,0.4)",
            borderRadius: 16,
            padding: "36px 20px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all .15s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)"
              ;(e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,207,164,0.4)"
              ;(e.currentTarget as HTMLElement).style.transform = "translateY(0)"
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 16 }}>🏢</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Preciso de equipe
            </div>
            <div style={{ fontSize: 12, color: "var(--txt-2)", lineHeight: 1.5 }}>
              Contrate por turno em minutos
            </div>
          </div>
        </Link>
      </div>

      {/* Trust signals */}
      <div style={{ display: "flex", gap: 24, fontSize: 12, color: "var(--txt-3)", marginBottom: 16 }}>
        <span>✓ CPF verificado</span>
        <span>✓ Pagamento via Pix</span>
        <span>✓ CLT Intermitente</span>
      </div>

      {/* Already have account */}
      <div style={{ fontSize: 13, color: "var(--txt-3)" }}>
        Já tem conta?{" "}
        <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
          Entrar
        </Link>
      </div>

      <p style={{ marginTop: 40, fontSize: 11, color: "var(--txt-3)", textAlign: "center" }}>
        MVP Beta · Curitiba · Eventos &amp; Hospitality
      </p>
    </main>
  )
}
