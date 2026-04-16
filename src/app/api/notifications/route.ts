// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const notifications = await db.notification.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take:    20,
    })

    return NextResponse.json({ data: notifications })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id, readAll } = await req.json()

    if (readAll) {
      await db.notification.updateMany({
        where: { userId: session.user.id },
        data:  { read: true },
      })
    } else if (id) {
      await db.notification.update({
        where: { id },
        data:  { read: true },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
