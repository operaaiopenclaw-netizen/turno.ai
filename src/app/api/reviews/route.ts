// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId
    const userId    = session?.user?.id

    if (!workerId && !companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { shiftId, rating, comment, revieweeId } = await req.json()
    if (!shiftId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    if (workerId) {
      const { data: app } = await supa
        .from("Application")
        .select("id, Timesheet(status)")
        .eq("shiftId", shiftId)
        .eq("workerId", workerId)
        .eq("status", "ACCEPTED")
        .single()

      const ts = (app as any)?.Timesheet
      const tsArr = Array.isArray(ts) ? ts : ts ? [ts] : []
      if (!app || !tsArr.some((t: any) => t.status === "APPROVED")) {
        return NextResponse.json({ error: "Você precisa ter trabalhado neste turno para avaliar" }, { status: 403 })
      }

      const { data: company } = await supa.from("Company").select("id, userId, tradeName").eq("id", revieweeId).single()
      if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

      const { data: existing } = await supa.from("Review").select("id").eq("reviewerId", userId!).eq("shiftId", shiftId).single()
      const reviewData = {
        fromType: "WORKER", reviewerId: userId!, workerId, companyId: revieweeId,
        rating: parseInt(rating), comment: comment ?? null, shiftId, updatedAt: new Date().toISOString(),
      }

      let review: any
      if (existing) {
        await supa.from("Review").update({ rating: parseInt(rating), comment: comment ?? null, updatedAt: new Date().toISOString() }).eq("id", existing.id)
        review = existing
      } else {
        const { data } = await supa.from("Review").insert({ id: crypto.randomUUID(), ...reviewData, createdAt: new Date().toISOString() }).select().single()
        review = data
      }

      const { data: allReviews } = await supa.from("Review").select("rating").eq("companyId", revieweeId)
      const avg = (allReviews ?? []).reduce((s: number, r: any) => s + r.rating, 0) / (allReviews ?? []).length
      await supa.from("Company").update({ rating: Math.round(avg * 10) / 10, updatedAt: new Date().toISOString() }).eq("id", revieweeId)

      await supa.from("Notification").insert({
        id: crypto.randomUUID(), userId: company.userId, type: "REVIEW_RECEIVED",
        title: "Nova avaliação recebida ⭐",
        body: `Um trabalhador deu nota ${rating}/5 para ${company.tradeName}`,
        data: { shiftId, rating }, read: false, createdAt: new Date().toISOString(),
      })

      return NextResponse.json({ data: review }, { status: 201 })
    }

    if (companyId) {
      const { data: worker } = await supa.from("Worker").select("id, userId").eq("id", revieweeId).single()
      if (!worker) return NextResponse.json({ error: "Trabalhador não encontrado" }, { status: 404 })

      const { data: existing } = await supa.from("Review").select("id").eq("reviewerId", userId!).eq("shiftId", shiftId).single()
      const reviewData = {
        fromType: "COMPANY", reviewerId: userId!, workerId: revieweeId, companyId,
        rating: parseInt(rating), comment: comment ?? null, shiftId, updatedAt: new Date().toISOString(),
      }

      let review: any
      if (existing) {
        await supa.from("Review").update({ rating: parseInt(rating), comment: comment ?? null, updatedAt: new Date().toISOString() }).eq("id", existing.id)
        review = existing
      } else {
        const { data } = await supa.from("Review").insert({ id: crypto.randomUUID(), ...reviewData, createdAt: new Date().toISOString() }).select().single()
        review = data
      }

      const { data: allReviews } = await supa.from("Review").select("rating").eq("workerId", revieweeId).eq("fromType", "COMPANY")
      const avg = (allReviews ?? []).reduce((s: number, r: any) => s + r.rating, 0) / (allReviews ?? []).length
      await supa.from("Worker").update({ rating: Math.round(avg * 10) / 10, updatedAt: new Date().toISOString() }).eq("id", revieweeId)

      await supa.from("Notification").insert({
        id: crypto.randomUUID(), userId: worker.userId, type: "REVIEW_RECEIVED",
        title: "Nova avaliação recebida ⭐",
        body: `Você recebeu nota ${rating}/5 de uma empresa`,
        data: { shiftId, rating }, read: false, createdAt: new Date().toISOString(),
      })

      return NextResponse.json({ data: review }, { status: 201 })
    }

    return NextResponse.json({ error: "Erro inesperado" }, { status: 500 })
  } catch (err: unknown) {
    console.error("[POST /api/reviews]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workerId  = searchParams.get("workerId")
  const companyId = searchParams.get("companyId")
  const shiftId   = searchParams.get("shiftId")

  let query = supa.from("Review").select("*").order("createdAt", { ascending: false }).limit(50)
  if (workerId)  query = query.eq("workerId", workerId)
  if (companyId) query = query.eq("companyId", companyId)
  if (shiftId)   query = query.eq("shiftId", shiftId)

  const { data: reviews } = await query
  return NextResponse.json({ data: reviews ?? [] })
}
