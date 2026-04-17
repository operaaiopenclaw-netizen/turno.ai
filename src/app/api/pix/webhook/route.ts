// src/app/api/pix/webhook/route.ts
// Webhook da Celcoin — confirma depósitos PIX recebidos pela plataforma
import { NextRequest, NextResponse } from "next/server"
import { walletService } from "@/lib/wallet"

// A Celcoin envia POST com o payload de confirmação
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validação básica do webhook
    const { transactionIdentification, endToEndId, status, amount } = body
    if (!transactionIdentification || status !== "PAID") {
      return NextResponse.json({ ok: true }) // ack sem processar
    }

    // transactionIdentification é o nosso walletTxId (referência que enviamos)
    await walletService.confirmDeposit(transactionIdentification, endToEndId ?? "")

    console.log(`[PIX Webhook] Depósito confirmado: ${transactionIdentification} — R$ ${amount}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PIX Webhook] Erro:", err)
    // Retorna 200 para o webhook não ficar reenviando
    return NextResponse.json({ ok: true })
  }
}
