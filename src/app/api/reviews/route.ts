// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session  = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId

    if (!workerId && !companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { shiftId, rating, comment, revieweeId } = await req.json()

    if (!shiftId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    // Worker reviewing company
    if (workerId) {
      const company = await db.company.findUnique({ where: { id: revieweeId } })
      if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

      const review = await db.review.create({
        data: {
          fromType:  "WORKER",
          workerId,
          companyId: revieweeId,
          rating:    parseInt(rating),
          comment:   comment ?? null,
          shiftId,
        },
      })

      // Recalculate company rating
      const allReviews = await db.review.findMany({
        where: { companyId: revieweeId },
      })
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
      await db.company.update({
        where: { id: revieweeId },
        data:  { rating: Math.round(avg * 10) / 10 },
      })

      return NextResponse.json({ data: review }, { status: 201 })
    }

    // Company reviewing worker
    if (companyId) {
      const worker = await db.worker.findUnique({ where: { id: revieweeId } })
      if (!worker) return NextResponse.json({ error: "Trabalhador não encontrado" }, { status: 404 })

      const review = await db.review.create({
        data: {
          fromType: "COMPANY",
          workerId: revieweeId,
          companyId,
          rating:   parseInt(rating),
          comment:  comment ?? null,
          shiftId,
        },
      })

      // Recalculate worker rating
      const allReviews = await db.review.findMany({
        where: { workerId: revieweeId, fromType: "COMPANY" },
      })
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
      await db.worker.update({
        where: { id: revieweeId },
        data:  { rating: Math.round(avg * 10) / 10 },
      })

      return NextResponse.json({ data: review }, { status: 201 })
    }
  } catch (err) {
    console.error("[POST /api/reviews]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workerId  = searchParams.get("workerId")
    const companyId = searchParams.get("companyId")

    const where: Record<string, unknown> = {}
    if (workerId)  where.workerId  = workerId
    if (companyId) where.companyId = companyId

    const reviews = await db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json({ data: reviews })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
