// src/app/api/workers/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { validateCPF } from "@/lib/utils"
import { verifyCPF } from "@/lib/kyc"
import { emailService } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, email, password, cpf, phone,
      pixKey, pixKeyType, neighborhood, bio, skills,
    } = body

    // Validate required
    if (!name || !email || !password || !cpf || !phone || !pixKey) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Senha deve ter ao menos 6 caracteres" }, { status: 400 })
    }

    const cleanCPF = cpf.replace(/\D/g, "")
    if (!validateCPF(cleanCPF)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 })
    }

    // Check duplicates
    const [existEmail, existCPF] = await Promise.all([
      db.user.findUnique({ where: { email } }),
      db.worker.findUnique({ where: { cpf: cleanCPF } }),
    ])
    if (existEmail) return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 })
    if (existCPF)   return NextResponse.json({ error: "CPF já cadastrado" }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)

    // KYC: verify CPF against Serpro (mock in dev)
    const cpfVerified = await verifyCPF(cleanCPF, name)

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "WORKER",
        worker: {
          create: {
            cpf:          cleanCPF,
            phone,
            bio:          bio ?? null,
            pixKey,
            pixKeyType:   pixKeyType ?? "EMAIL",
            neighborhood: neighborhood ?? null,
            cpfVerified,
            skills: {
              create: (skills as string[] ?? []).map((s: string) => ({ skill: s })),
            },
          },
        },
      },
      include: { worker: true },
    })

    // Welcome email (mocked in dev)
    await emailService.welcomeWorker(email, name)

    return NextResponse.json({
      data: { id: user.id, email: user.email, name: user.name },
    }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/workers]", err)
    return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 })
  }
}
