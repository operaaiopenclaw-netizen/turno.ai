// src/app/api/wallet/card/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { walletService } from "@/lib/wallet"
import { db } from "@/lib/db"

// GET /api/wallet/card — dados do cartão virtual
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const wallet = await db.wallet.findUnique({
    where:   { userId: session.user.id },
    include: { virtualCard: true },
  })

  return NextResponse.json({ virtualCard: wallet?.virtualCard ?? null })
}

// POST /api/wallet/card — solicitar cartão virtual
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = session.user as { id: string; role?: string }
  if (user.role !== "WORKER") {
    return NextResponse.json({ error: "Cartão virtual disponível apenas para workers" }, { status: 403 })
  }

  try {
    const card = await walletService.requestVirtualCard(session.user.id)
    return NextResponse.json({ virtualCard: card }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
