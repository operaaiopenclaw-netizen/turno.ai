// src/app/api/companies/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import { validateCNPJ } from "@/lib/utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, cnpj, tradeName, legalName, phone, address, neighborhood, industry, pixKey, pixKeyType } = body

    if (!name || !email || !password || !cnpj || !tradeName || !phone) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
    }

    const cleanCNPJ = cnpj.replace(/\D/g, "")
    if (!validateCNPJ(cleanCNPJ)) return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 })

    const [{ data: existEmail }, { data: existCNPJ }] = await Promise.all([
      supa.from("User").select("id").eq("email", email).single(),
      supa.from("Company").select("id").eq("cnpj", cleanCNPJ).single(),
    ])
    if (existEmail) return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 })
    if (existCNPJ)  return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)
    const userId    = crypto.randomUUID()
    const companyId = crypto.randomUUID()

    await supa.from("User").insert({ id: userId, name, email, passwordHash, role: "COMPANY", updatedAt: new Date().toISOString() })
    await supa.from("Company").insert({
      id: companyId, userId, cnpj: cleanCNPJ, tradeName,
      legalName: legalName ?? tradeName, phone,
      address: address ?? "", neighborhood: neighborhood ?? "",
      pixKey: pixKey ?? null, pixKeyType: pixKeyType ?? null,
      industry: industry ?? "HOSPITALITY", verified: false,
      rating: 0, totalShifts: 0, updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ data: { id: userId, email, name } }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/companies]", err)
    return NextResponse.json({ error: "Erro ao criar empresa" }, { status: 500 })
  }
}
