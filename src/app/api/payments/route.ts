// src/app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { pix } from "@/lib/pix"
import { blockchain } from "@/lib/blockchain"
import { walletService } from "@/lib/wallet"
import { calcPlatformFee, calcNetAmount } from "@/lib/utils"

export async function GET(req: NextRequest) {
  try {
    const session   = await auth()
    const companyId = (session?.user as { companyId?: string })?.companyId
    const workerId  = (session?.user as { workerId?: string })?.workerId

    const where: Record<string, unknown> = {}
    if (companyId) where.shift = { companyId }
    if (workerId)  where.application = { workerId }

    const payments = await db.payment.findMany({
      where,
      include: {
        shift:       { select: { role: true, date: true, neighborhood: true } },
        application: {
          include: {
            worker: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take:    100,
    })

    return NextResponse.json({ data: payments })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session   = await auth()
    const companyId = (session?.user as { companyId?: string })?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { timesheetId, useWallet } = await req.json()
    if (!timesheetId) return NextResponse.json({ error: "timesheetId obrigatório" }, { status: 400 })

    const timesheet = await db.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        shift:       true,
        application: true,
        worker: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    })

    if (!timesheet)
      return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })
    if (timesheet.shift.companyId !== companyId)
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    if (timesheet.status !== "APPROVED")
      return NextResponse.json({ error: "Timesheet precisa ser aprovado primeiro" }, { status: 400 })

    const existing = await db.payment.findUnique({
      where: { applicationId: timesheet.applicationId },
    })
    if (existing?.status === "PAID") {
      return NextResponse.json({ error: "Já pago" }, { status: 400 })
    }

    const amount    = timesheet.shift.totalPay
    const fee       = calcPlatformFee(amount)
    const net       = calcNetAmount(amount)
    const workerName = timesheet.worker.user.name ?? "Trabalhador"
    const workerUserId = timesheet.worker.user.id

    // Cria/atualiza registro de pagamento
    const payment = existing
      ? await db.payment.update({ where: { id: existing.id }, data: { status: "PROCESSING" } })
      : await db.payment.create({
          data: {
            shiftId:       timesheet.shiftId,
            applicationId: timesheet.applicationId,
            timesheetId,
            amount,
            platformFee:   fee,
            netAmount:     net,
            pixKey:        timesheet.worker.pixKey ?? undefined,
            pixKeyType:    timesheet.worker.pixKeyType ?? undefined,
            status:        "PROCESSING",
          },
        })

    let pixE2eId         = ""
    let settlementType   = "PIX"
    let blockchainResult

    // ── OPÇÃO 1: Pagamento via carteira interna (BRLC) ─────────────────────────
    if (useWallet) {
      try {
        settlementType = "WALLET"
        const companyUser = await db.company.findUnique({
          where:   { id: companyId },
          include: { user: true },
        })
        if (!companyUser) throw new Error("Empresa não encontrada")

        await walletService.releaseEscrow(
          companyUser.userId,
          workerUserId,
          amount,
          fee,
          payment.id
        )
      } catch (err) {
        await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } })
        return NextResponse.json({ error: (err as Error).message }, { status: 400 })
      }
    } else {
      // ── OPÇÃO 2: Pagamento direto via PIX ──────────────────────────────────
      const pixKey = timesheet.worker.pixKey
      if (!pixKey) {
        await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } })
        return NextResponse.json({ error: "Trabalhador sem chave PIX cadastrada" }, { status: 400 })
      }

      try {
        const pixResult = await pix.sendPayment({
          amount:        net,
          pixKey,
          pixKeyType:    (timesheet.worker.pixKeyType ?? "EMAIL") as "CPF" | "EMAIL" | "PHONE" | "RANDOM",
          description:   `Turno ${timesheet.shift.role} — ${timesheet.shift.date.toLocaleDateString("pt-BR")}`,
          externalId:    payment.id,
          recipientName: workerName,
        })
        pixE2eId = pixResult.e2eId

        // Atualiza ganhos do worker
        await db.worker.update({
          where: { id: timesheet.workerId },
          data:  { totalEarnings: { increment: net }, totalShifts: { increment: 1 } },
        })
      } catch {
        await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } })
        return NextResponse.json({ error: "Falha no pagamento Pix" }, { status: 502 })
      }
    }

    // Registra na blockchain (Polygon) — ambos os métodos
    try {
      blockchainResult = await blockchain.registerPayment({
        paymentId:      payment.id,
        workerId:       timesheet.workerId,
        companyId,
        shiftId:        timesheet.shiftId,
        amountCents:    Math.round(net * 100),
        pixE2eId,
        settlementType,
      })
    } catch {
      console.warn("Blockchain registration failed — continuing")
    }

    // Atualiza pagamento como PAGO
    const updatedPayment = await db.payment.update({
      where: { id: payment.id },
      data: {
        status:           "PAID",
        pixE2eId:         pixE2eId || undefined,
        paidAt:           new Date(),
        blockchainTxHash: blockchainResult?.txHash    ?? undefined,
        blockchainBlock:  blockchainResult?.blockNumber ?? undefined,
        blockchainNetwork: blockchainResult?.network  ?? undefined,
        walletTxId:       settlementType === "WALLET" ? payment.id : undefined,
      },
    })

    // Turno → COMPLETED se era o último payment pendente
    const pendingTimesheets = await db.timesheet.count({
      where: { shiftId: timesheet.shiftId, status: { not: "APPROVED" } },
    })
    if (pendingTimesheets === 0) {
      await db.shift.update({
        where: { id: timesheet.shiftId },
        data:  { status: "COMPLETED" },
      })
      // Incrementa totalShifts da empresa apenas uma vez por turno
      await db.company.update({
        where: { id: companyId },
        data:  { totalShifts: { increment: 1 } },
      })
    }

    // Notifica worker
    await db.notification.create({
      data: {
        userId: workerUserId,
        type:   "PAYMENT_SENT",
        title:  "Pagamento recebido ⚡",
        body:   settlementType === "WALLET"
          ? `R$ ${net.toFixed(2)} adicionados à sua carteira Turno`
          : `R$ ${net.toFixed(2)} enviados via PIX para sua conta`,
        data: {
          paymentId:      updatedPayment.id,
          amount:         net,
          settlementType,
          txHash:         blockchainResult?.txHash,
          explorerUrl:    blockchainResult?.explorerUrl,
        },
      },
    })

    return NextResponse.json({
      data: {
        ...updatedPayment,
        settlementType,
        explorerUrl: blockchainResult?.explorerUrl,
      },
    })
  } catch (err) {
    console.error("[POST /api/payments]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
