"use client"
// src/app/login/page.tsx
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input, Card } from "@/components/ui"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError("Email ou senha incorretos")
      setLoading(false)
      return
    }

    // Redirect based on role - fetch session to know role
    const meRes = await fetch("/api/auth/session")
    const me    = await meRes.json()
    const role  = me?.user?.role

    if (role === "COMPANY") router.push("/empresa")
    else                    router.push("/worker")
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/">
            <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>
              Turno<span style={{ color: "var(--primary)" }}>.</span>
            </span>
          </Link>
          <p style={{ color: "var(--txt-2)", fontSize: 13, marginTop: 6 }}>
            Bem-vindo de volta
          </p>
        </div>

        <Card>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <div style={{
                background: "var(--red-dim)",
                border: "0.5px solid rgba(255,107,107,0.3)",
                borderRadius: 9,
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--red)",
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <Button type="submit" full loading={loading} size="lg">
              Entrar
            </Button>
          </form>

          {/* Demo accounts */}
          <div style={{
            marginTop: 20,
            padding: "14px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 9,
            border: "0.5px solid var(--border)",
          }}>
            <div style={{ fontSize: 10, color: "var(--txt-3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
              Contas de demonstração
            </div>
            {[
              { label: "🧑‍🍳 Trabalhadora", email: "ana.lima@gmail.com", pass: "senha123" },
              { label: "🍺 Cervejaria Bodebrown", email: "rh@bodebrown.com.br", pass: "senha123" },
              { label: "🏛 Espaço Villa", email: "eventos@espacovilla.com.br", pass: "senha123" },
            ].map(a => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setPassword(a.pass) }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 0",
                  background: "none",
                  border: "none",
                  color: "var(--txt-2)",
                  fontSize: 12,
                  cursor: "pointer",
                  borderBottom: "0.5px solid var(--border)",
                }}
              >
                {a.label} — <span style={{ color: "var(--primary)" }}>{a.email}</span>
              </button>
            ))}
          </div>
        </Card>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--txt-3)" }}>
          Não tem conta?{" "}
          <Link href="/" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Cadastrar
          </Link>
        </p>
      </div>
    </div>
  )
}
