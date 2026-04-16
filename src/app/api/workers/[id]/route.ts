// src/app/api/workers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session  = await auth()
    const workerId = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId

    // Workers can see their own profile; companies can see any worker
    if (!workerId && !companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    if (workerId && workerId !== params.id && !companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const worker = await db.worker.findUnique({
      where: { id: params.id },
      include: {
        user:   { select: { name: true, email: true, image: true } },
        skills: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    })

    if (!worker) return NextResponse.json({ error: "Trabalhador não encontrado" }, { status: 404 })

    // Mask sensitive data for companies
    const data = companyId && workerId !== params.id
      ? {
          ...worker,
          cpf:    undefined,
          pixKey: undefined,
        }
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
    if (!workerId || workerId !== params.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const { bio, pixKey, pixKeyType, neighborhood, skills } = body

    const updated = await db.worker.update({
      where: { id: params.id },
      data: {
        bio:          bio          ?? undefined,
        pixKey:       pixKey       ?? undefined,
        pixKeyType:   pixKeyType   ?? undefined,
        neighborhood: neighborhood ?? undefined,
        ...(skills ? {
          skills: {
            deleteMany: {},
            create: (skills as string[]).map((s: string) => ({ skill: s })),
          },
        } : {}),
      },
      include: {
        user:   { select: { name: true, email: true } },
        skills: true,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error("[PATCH /api/workers/[id]]", err)
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 })
  }
}
