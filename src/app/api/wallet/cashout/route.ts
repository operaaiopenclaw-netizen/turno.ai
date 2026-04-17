// src/app/api/wallet/cashout/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { walletService } from "@/lib/wallet"

// POST /api/wallet/cashout — worker saca para PIX
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = session.user as { id: string; role?: string }
  if (user.role !== "WORKER") {
    return NextResponse.json({ error: "Apenas workers podem sacar" }, { status: 403 })
  }

  const { amount } = await req.json()
  if (!amount || isNaN(Number(amount))) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
  }

  const worker = await db.worker.findUnique({
    where:   { userId: session.user.id },
    include: { user: true },
  })
  if (!worker?.pixKey) {
    return NextResponse.json({ error: "Configure sua chave PIX no perfil antes de sacar" }, { status: 400 })
  }

  try {
    const result = await walletService.cashoutPix(
      session.user.id,
      Number(amount),
      worker.pixKey,
      worker.pixKeyType ?? "EMAIL",
      worker.user.name ?? "Worker Turno"
    )
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
