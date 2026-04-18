// src/app/api/shifts/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supa } from "@/lib/supabase"
import { calcHours } from "@/lib/utils"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category  = searchParams.get("category")
    const workerId  = searchParams.get("workerId")
    const companyId = searchParams.get("companyId")
    const status    = searchParams.get("status") ?? "OPEN"

    let query = supa
      .from("Shift")
      .select("*, Company(id, tradeName, neighborhood, rating)")
      .order("urgent", { ascending: false })
      .order("date", { ascending: true })

    if (status !== "all") query = query.eq("status", status)
    if (category)          query = query.eq("category", category)
    if (companyId)         query = query.eq("companyId", companyId)

    const { data: shifts, error } = await query
    if (error) throw error

    let data = shifts ?? []

    if (workerId && data.length > 0) {
      const { data: apps } = await supa
        .from("Application")
        .select("id, status, shiftId")
        .eq("workerId", workerId)
        .in("shiftId", data.map((s: any) => s.id))

      const appMap = Object.fromEntries((apps ?? []).map((a: any) => [a.shiftId, a]))
      data = data.map((s: any) => ({ ...s, userApplication: appMap[s.id] ?? null }))
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error("[GET /api/shifts]", err)
    return NextResponse.json({ error: "Erro ao buscar turnos" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const body = await req.json()
    const { role, description, requirements, dresscode, date, startTime, endTime, payPerHour, spots, category, neighborhood, address, latitude, longitude, urgent } = body

    if (!role || !description || !date || !startTime || !endTime || !payPerHour || !spots || !category || !neighborhood)
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })

    const hours    = calcHours(startTime, endTime)
    const totalPay = Number(payPerHour) * hours

    const { data, error } = await supa.from("Shift").insert({
      id: crypto.randomUUID(), companyId, role, description, requirements, dresscode,
      date: new Date(date).toISOString(), startTime, endTime, hours,
      payPerHour: Number(payPerHour), totalPay, spots: Number(spots), filledSpots: 0,
      category, neighborhood, address, latitude, longitude,
      urgent: urgent ?? false, status: "OPEN", updatedAt: new Date().toISOString(),
    }).select().single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/shifts]", err)
    return NextResponse.json({ error: "Erro ao criar turno" }, { status: 500 })
  }
}
