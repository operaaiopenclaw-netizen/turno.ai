// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session  = await auth()
    const workerId  = (session?.user as { workerId?: string })?.workerId
    const companyId = (session?.user as { companyId?: string })?.companyId
    const userId    = session?.user?.id

    if (!workerId && !companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { shiftId, rating, comment, revieweeId } = await req.json()

    if (!shiftId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    // Valida que o reviewer participou do shift
    if (workerId) {
      const app = await db.application.findFirst({
        where: {
          shiftId,
          workerId,
          status:    "ACCEPTED",
          timesheet: { status: "APPROVED" },
        },
      })
      if (!app) {
        return NextResponse.json({ error: "Você precisa ter trabalhado neste turno para avaliar" }, { status: 403 })
      }
    }

    const reviewerUserId = userId ?? ""

    // Worker avalia empresa
    if (workerId) {
      const company = await db.company.findUnique({ where: { id: revieweeId } })
      if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

      const review = await db.review.upsert({
        where:  { reviewerId_shiftId: { reviewerId: reviewerUserId, shiftId } },
        update: { rating: parseInt(rating), comment: comment ?? null },
        create: {
          fromType:   "WORKER",
          reviewerId: reviewerUserId,
          workerId,
          companyId:  revieweeId,
          rating:     parseInt(rating),
          comment:    comment ?? null,
          shiftId,
        },
      })

      const allReviews = await db.review.findMany({ where: { companyId: revieweeId } })
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
      await db.company.update({ where: { id: revieweeId }, data: { rating: Math.round(avg * 10) / 10 } })

      await db.notification.create({
        data: {
          userId: company.userId,
          type:   "REVIEW_RECEIVED",
          title:  "Nova avaliação recebida ⭐",
          body:   `Um trabalhador deu nota ${rating}/5 para ${company.tradeName}`,
          data:   { shiftId, rating },
        },
      })

      return NextResponse.json({ data: review }, { status: 201 })
    }

    // Empresa avalia worker
    if (companyId) {
      const worker = await db.worker.findUnique({
        where: { id: revieweeId },
        include: { user: true },
      })
      if (!worker) return NextResponse.json({ error: "Trabalhador não encontrado" }, { status: 404 })

      const review = await db.review.upsert({
        where:  { reviewerId_shiftId: { reviewerId: reviewerUserId, shiftId } },
        update: { rating: parseInt(rating), comment: comment ?? null },
        create: {
          fromType:   "COMPANY",
          reviewerId: reviewerUserId,
          workerId:   revieweeId,
          companyId,
          rating:     parseInt(rating),
          comment:    comment ?? null,
          shiftId,
        },
      })

      const allReviews = await db.review.findMany({ where: { workerId: revieweeId, fromType: "COMPANY" } })
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
      await db.worker.update({ where: { id: revieweeId }, data: { rating: Math.round(avg * 10) / 10 } })

      await db.notification.create({
        data: {
          userId: worker.userId,
          type:   "REVIEW_RECEIVED",
          title:  "Nova avaliação recebida ⭐",
          body:   `Você recebeu nota ${rating}/5 de uma empresa`,
          data:   { shiftId, rating },
        },
      })

      return NextResponse.json({ data: review }, { status: 201 })
    }

    return NextResponse.json({ error: "Erro inesperado" }, { status: 500 })
  } catch (err: unknown) {
    // Duplicate review — silently handle
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Você já avaliou este turno" }, { status: 409 })
    }
    console.error("[POST /api/reviews]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workerId  = searchParams.get("workerId")
  const companyId = searchParams.get("companyId")
  const shiftId   = searchParams.get("shiftId")

  const where: Record<string, unknown> = {}
  if (workerId)  where.workerId  = workerId
  if (companyId) where.companyId = companyId
  if (shiftId)   where.shiftId   = shiftId

  const reviews = await db.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    50,
  })

  return NextResponse.json({ data: reviews })
}
