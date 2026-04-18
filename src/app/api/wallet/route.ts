// src/app/api/wallet/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supa } from "@/lib/supabase"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const uid = session.user.id

  const [walletRes, txRes, cardRes] = await Promise.all([
    supa.from("Wallet").select("*").eq("userId", uid).single(),
    supa.from("WalletTransaction").select("*").eq("walletId", uid).order("createdAt", { ascending: false }).limit(30),
    supa.from("Wallet").select("id").eq("userId", uid).single(),
  ])

  // Get wallet id to query virtual card
  const walletId = walletRes.data?.id
  const cardRes2 = walletId
    ? await supa.from("VirtualCard").select("*").eq("walletId", walletId).single()
    : { data: null }

  const wallet = walletRes.data
  const balance = wallet
    ? { available: Number(wallet.balance), reserved: Number(wallet.reserved), totalIn: Number(wallet.totalIn), totalOut: Number(wallet.totalOut) }
    : { available: 0, reserved: 0, totalIn: 0, totalOut: 0 }

  // Get transactions with walletId
  let transactions = []
  if (walletId) {
    const txRes2 = await supa.from("WalletTransaction").select("*").eq("walletId", walletId).order("createdAt", { ascending: false }).limit(30)
    transactions = txRes2.data ?? []
  }

  return NextResponse.json({ balance, transactions, virtualCard: cardRes2.data ?? null })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = session.user as { id: string; role?: string }
  if (user.role !== "COMPANY" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas empresas podem depositar" }, { status: 403 })
  }

  const { amount } = await req.json()
  if (!amount || isNaN(Number(amount))) return NextResponse.json({ error: "Valor inválido" }, { status: 400 })

  // Mock PIX QR code for demo
  const txId = `DEP-${user.id.slice(-8)}-${Date.now()}`
  return NextResponse.json({
    walletTxId: txId,
    qrCode: "00020126580014br.gov.bcb.pix0136demo-pix-key@turno.ai52040000530398654071000.005802BR5909TURNO AIR6008CURITIBA62070503***6304ABCD",
    pixKey: "turno@turno.ai",
    amount: Number(amount),
    expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
  }, { status: 201 })
}
