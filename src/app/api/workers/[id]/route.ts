// src/app/api/workers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId

    if (!workerId && !companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    if (workerId && workerId !== params.id && !companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

    const { data: worker } = await supa
      .from("Worker")
      .select("*, User(name, email, image), WorkerSkill(skill), Review(rating, comment, createdAt, fromType)")
      .eq("id", params.id)
      .single()

    if (!worker) return NextResponse.json({ error: "Trabalhador não encontrado" }, { status: 404 })

    const isOwnProfile = workerId === params.id
    const data = companyId && !isOwnProfile
      ? { ...worker, cpf: undefined, pixKey: undefined }
      : worker

    return NextResponse.json({ data })
  } catch (err) {
    console.error("[GET /api/workers/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session  = await auth()
    const workerId = (session?.user as any)?.workerId
    if (!workerId || workerId !== params.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await req.json()
    const { bio, pixKey, pixKeyType, neighborhood, phone, skills } = body

    const updateData: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (bio          !== undefined) updateData.bio          = bio
    if (pixKey       !== undefined) updateData.pixKey       = pixKey
    if (pixKeyType   !== undefined) updateData.pixKeyType   = pixKeyType
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood
    if (phone        !== undefined) updateData.phone        = phone

    await supa.from("Worker").update(updateData).eq("id", params.id)

    if (skills) {
      await supa.from("WorkerSkill").delete().eq("workerId", params.id)
      if (skills.length > 0) {
        await supa.from("WorkerSkill").insert(
          (skills as string[]).map((s: string) => ({ id: crypto.randomUUID(), workerId: params.id, skill: s }))
        )
      }
    }

    const { data: updated } = await supa
      .from("Worker")
      .select("*, User(name, email), WorkerSkill(skill)")
      .eq("id", params.id)
      .single()

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("[PATCH /api/workers/[id]]", err)
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 })
  }
}
