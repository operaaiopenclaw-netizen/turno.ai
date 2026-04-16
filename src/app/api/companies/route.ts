// src/app/api/companies/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { validateCNPJ } from "@/lib/utils"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, email, password, cnpj, tradeName, legalName,
      phone, address, neighborhood, industry, pixKey, pixKeyType,
    } = body

    if (!name || !email || !password || !cnpj || !tradeName || !phone) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
    }

    const cleanCNPJ = cnpj.replace(/\D/g, "")
    if (!validateCNPJ(cleanCNPJ)) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 })
    }

    const [existEmail, existCNPJ] = await Promise.all([
      db.user.findUnique({ where: { email } }),
      db.company.findUnique({ where: { cnpj: cleanCNPJ } }),
    ])
    if (existEmail) return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 })
    if (existCNPJ)  return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "COMPANY",
        company: {
          create: {
            cnpj:         cleanCNPJ,
            tradeName,
            legalName:    legalName ?? tradeName,
            phone,
            address:      address ?? "",
            neighborhood: neighborhood ?? "",
            pixKey:       pixKey ?? null,
            pixKeyType:   pixKeyType ?? null,
            industry:     industry ?? "HOSPITALITY",
            verified:     false, // Manual verification in prod
          },
        },
      },
      include: { company: true },
    })

    return NextResponse.json({
      data: { id: user.id, email: user.email, name: user.name },
    }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/companies]", err)
    return NextResponse.json({ error: "Erro ao criar empresa" }, { status: 500 })
  }
}
