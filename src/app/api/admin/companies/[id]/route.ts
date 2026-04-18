// src/app/api/admin/companies/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const role    = (session?.user as any)?.role
    if (role !== "ADMIN") return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

    const { data: company } = await supa
      .from("Company")
      .select("id, userId, tradeName, verified")
      .eq("id", params.id)
      .single()

    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

    await supa.from("Company").update({ verified: true, updatedAt: new Date().toISOString() }).eq("id", params.id)

    await supa.from("Notification").insert({
      id: crypto.randomUUID(), userId: company.userId, type: "DEPOSIT_CONFIRMED",
      title: "Empresa verificada ✅",
      body: `Parabéns! ${company.tradeName} foi verificada pela equipe Turno.ai e já pode publicar turnos sem restrições.`,
      data: { companyId: company.id }, read: false, createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ data: { id: params.id, verified: true } })
  } catch (err) {
    console.error("[PATCH /api/admin/companies/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
