// src/app/api/wallet/card/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supa } from "@/lib/supabase"
import { walletService } from "@/lib/wallet"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: wallet } = await supa.from("Wallet").select("id").eq("userId", session.user.id).single()
  if (!wallet) return NextResponse.json({ virtualCard: null })

  const { data: virtualCard } = await supa.from("VirtualCard").select("*").eq("walletId", wallet.id).single()
  return NextResponse.json({ virtualCard: virtualCard ?? null })
}

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
