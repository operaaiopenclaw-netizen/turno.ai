// src/app/api/workers/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { validateCPF } from "@/lib/utils"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (id) {
      const { data } = await supa
        .from("Worker")
        .select("*, User(id, name, email), WorkerSkill(skill)")
        .eq("id", id)
        .single()
      return NextResponse.json({ data })
    }

    // List workers (admin only)
    const session = await auth()
    if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data } = await supa
      .from("Worker")
      .select("*, User(name, email), WorkerSkill(skill)")
      .order("rating", { ascending: false })

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, cpf, phone, neighborhood, pixKey, pixKeyType } = body

    if (!email || !password || !cpf || !phone) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
    }
    if (!validateCPF(cpf)) return NextResponse.json({ error: "CPF inválido" }, { status: 400 })

    const { data: existing } = await supa.from("User").select("id").eq("email", email).single()
    if (existing) return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 })

    const hash = await bcrypt.hash(password, 12)
    const userId = crypto.randomUUID()
    const workerId = crypto.randomUUID()

    await supa.from("User").insert({ id: userId, name, email, passwordHash: hash, role: "WORKER", updatedAt: new Date().toISOString() })
    await supa.from("Worker").insert({ id: workerId, userId, cpf, phone, neighborhood: neighborhood ?? "Curitiba", pixKey, pixKeyType, rating: 0, totalShifts: 0, totalEarnings: 0, cpfVerified: false, backgroundCheck: "PENDING", updatedAt: new Date().toISOString() })

    return NextResponse.json({ ok: true, workerId }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/workers]", err)
    return NextResponse.json({ error: "Erro ao criar worker" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const workerId = (session.user as any)?.workerId
    if (!workerId) return NextResponse.json({ error: "Não é worker" }, { status: 403 })

    const body = await req.json()
    const { phone, bio, address, neighborhood, pixKey, pixKeyType, skills } = body

    await supa.from("Worker").update({ phone, bio, address, neighborhood, pixKey, pixKeyType, updatedAt: new Date().toISOString() }).eq("id", workerId)

    if (skills) {
      await supa.from("WorkerSkill").delete().eq("workerId", workerId)
      if (skills.length > 0) {
        await supa.from("WorkerSkill").insert(skills.map((s: string) => ({ id: crypto.randomUUID(), workerId, skill: s })))
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 })
  }
}
