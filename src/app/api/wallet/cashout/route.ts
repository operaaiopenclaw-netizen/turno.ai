// src/app/api/wallet/cashout/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supa } from "@/lib/supabase"
import { walletService } from "@/lib/wallet"

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

  const { data: worker } = await supa
    .from("Worker")
    .select("pixKey, pixKeyType, User(name)")
    .eq("userId", session.user.id)
    .single()

  if (!worker?.pixKey) {
    return NextResponse.json({ error: "Configure sua chave PIX no perfil antes de sacar" }, { status: 400 })
  }

  try {
    const result = await walletService.cashoutPix(
      session.user.id,
      Number(amount),
      worker.pixKey,
      worker.pixKeyType ?? "EMAIL",
      (worker as any).User?.name ?? "Worker Turno"
    )
    return NextResponse.json(result)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
