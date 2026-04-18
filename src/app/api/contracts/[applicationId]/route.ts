// src/app/api/contracts/[applicationId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { buildContractData, generateContractHTML } from "@/lib/contract"

export async function GET(_req: NextRequest, { params }: { params: { applicationId: string } }) {
  try {
    const session   = await auth()
    const workerId  = (session?.user as any)?.workerId
    const companyId = (session?.user as any)?.companyId

    if (!workerId && !companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const data = await buildContractData(params.applicationId)
    if (!data) return NextResponse.json({ error: "Candidatura não encontrada" }, { status: 404 })

    const html = generateContractHTML(data)

    return new NextResponse(html, {
      headers: {
        "Content-Type":        "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="contrato-${data.contractId}.html"`,
      },
    })
  } catch (err) {
    console.error("[GET /api/contracts]", err)
    return NextResponse.json({ error: "Erro ao gerar contrato" }, { status: 500 })
  }
}
