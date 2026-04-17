// src/app/api/wallet/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { walletService } from "@/lib/wallet"

// GET /api/wallet — saldo e transações recentes
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [balance, transactions, card] = await Promise.all([
    walletService.getBalance(session.user.id),
    walletService.getTransactions(session.user.id, 30),
    db.wallet.findUnique({
      where:   { userId: session.user.id },
      include: { virtualCard: true },
    }),
  ])

  return NextResponse.json({
    balance,
    transactions,
    virtualCard: card?.virtualCard ?? null,
  })
}

// POST /api/wallet — iniciar depósito PIX (empresa)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = session.user as { id: string; role?: string }
  if (user.role !== "COMPANY" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas empresas podem depositar" }, { status: 403 })
  }

  const { amount } = await req.json()
  if (!amount || isNaN(Number(amount))) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
  }

  try {
    const result = await walletService.initiateDeposit(session.user.id, Number(amount))
    return NextResponse.json(result, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
