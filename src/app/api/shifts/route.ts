// src/app/api/shifts/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { calcHours } from "@/lib/utils"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category  = searchParams.get("category")
    const workerId  = searchParams.get("workerId")
    const companyId = searchParams.get("companyId")
    const status    = searchParams.get("status")

    const where: Record<string, unknown> = {
      status: status ?? "OPEN",
    }
    if (category)  where.category  = category
    if (companyId) where.companyId = companyId

    const shifts = await db.shift.findMany({
      where,
      include: {
        company:  { include: { user: { select: { name: true, email: true } } } },
        _count:   { select: { applications: true } },
        // Include worker's application if workerId provided
        ...(workerId ? {
          applications: {
            where: { workerId },
            take: 1,
          },
        } : {}),
      },
      orderBy: [{ urgent: "desc" }, { date: "asc" }],
    })

    const data = shifts.map(s => ({
      ...s,
      userApplication: workerId
        ? (s as any).applications?.[0] ?? null
        : undefined,
      applications: undefined,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error("[GET /api/shifts]", err)
    return NextResponse.json({ error: "Erro ao buscar turnos" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await req.json()
    const {
      role, description, requirements, dresscode,
      date, startTime, endTime, totalPay, spots,
      category, neighborhood, address, urgent,
    } = body

    if (!role || !date || !startTime || !endTime || !totalPay || !category) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
    }

    const hours      = calcHours(startTime, endTime)
    const payPerHour = parseFloat(totalPay) / hours

    const shift = await db.shift.create({
      data: {
        companyId,
        role,
        description:  description ?? "",
        requirements: requirements ?? null,
        dresscode:    dresscode ?? null,
        date:         new Date(date),
        startTime,
        endTime,
        hours,
        payPerHour:   Math.round(payPerHour * 100) / 100,
        totalPay:     parseFloat(totalPay),
        spots:        parseInt(spots) || 1,
        category,
        neighborhood: neighborhood ?? "",
        address:      address ?? null,
        urgent:       urgent ?? false,
        status:       "OPEN",
      },
      include: {
        company: { include: { user: { select: { name: true } } } },
      },
    })

    return NextResponse.json({ data: shift }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/shifts]", err)
    return NextResponse.json({ error: "Erro ao criar turno" }, { status: 500 })
  }
}
