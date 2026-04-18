// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supa } from "@/lib/supabase"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const { data } = await supa.from("Notification").select("*").eq("userId", session.user.id).order("createdAt", { ascending: false }).limit(20)
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const { id, readAll } = await req.json()
    if (readAll) await supa.from("Notification").update({ read: true }).eq("userId", session.user.id)
    else if (id) await supa.from("Notification").update({ read: true }).eq("id", id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
