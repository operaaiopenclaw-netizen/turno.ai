// src/app/api/admin/companies/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const role    = (session?.user as { role?: string })?.role
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const company = await db.company.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, tradeName: true, verified: true },
    })
    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    const updated = await db.company.update({
      where: { id: params.id },
      data:  { verified: true },
    })

    await db.notification.create({
      data: {
        userId: company.userId,
        type:   "DEPOSIT_CONFIRMED",
        title:  "Empresa verificada ✅",
        body:   `Parabéns! ${company.tradeName} foi verificada pela equipe Turno.ai e já pode publicar turnos sem restrições.`,
        data:   { companyId: company.id },
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("[PATCH /api/admin/companies/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
