// src/app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { pix } from "@/lib/pix"
import { blockchain } from "@/lib/blockchain"
import { calcPlatformFee } from "@/lib/utils"
import { PLATFORM_FEE } from "@/types"

export async function GET(req: NextRequest) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    const workerId  = (session?.user as any)?.workerId

    const where: Record<string, unknown> = {}
    if (companyId) where.shift = { companyId }
    if (workerId) {
      where.application = { workerId }
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        shift:       { select: { role: true, date: true } },
        application: {
          include: {
            worker: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: payments })
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { timesheetId } = await req.json()
    if (!timesheetId) return NextResponse.json({ error: "timesheetId obrigatório" }, { status: 400 })

    // Load timesheet with all relations
    const timesheet = await db.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        shift:       true,
        application: true,
        worker: {
          include: { user: { select: { name: true } } },
        },
      },
    })

    if (!timesheet) return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })
    if (timesheet.shift.companyId !== companyId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }
    if (timesheet.status !== "APPROVED") {
      return NextResponse.json({ error: "Timesheet precisa ser aprovado primeiro" }, { status: 400 })
    }

    // Check for existing payment
    const existing = await db.payment.findUnique({
      where: { applicationId: timesheet.applicationId },
    })
    if (existing?.status === "PAID") {
      return NextResponse.json({ error: "Já pago" }, { status: 400 })
    }

    const amount     = timesheet.shift.totalPay
    const fee        = calcPlatformFee(amount)
    const netAmount  = amount - fee
    const workerName = timesheet.worker.user.name ?? "Trabalhador"
    const pixKey     = timesheet.worker.pixKey

    if (!pixKey) {
      return NextResponse.json({ error: "Trabalhador sem chave Pix cadastrada" }, { status: 400 })
    }

    // Create or update payment record
    const payment = existing
      ? await db.payment.update({
          where: { id: existing.id },
          data: { status: "PROCESSING" },
        })
      : await db.payment.create({
          data: {
            shiftId:       timesheet.shiftId,
            applicationId: timesheet.applicationId,
            timesheetId:   timesheetId,
            amount,
            platformFee:   fee,
            netAmount,
            pixKey,
            pixKeyType:    timesheet.worker.pixKeyType ?? "EMAIL",
            status:        "PROCESSING",
          },
        })

    // Send Pix payment
    let pixResult
    try {
      pixResult = await pix.sendPayment({
        amount:        netAmount,
        pixKey,
        pixKeyType:    (timesheet.worker.pixKeyType ?? "EMAIL") as any,
        description:   `Turno ${timesheet.shift.role} - ${timesheet.shift.date.toLocaleDateString("pt-BR")}`,
        externalId:    payment.id,
        recipientName: workerName,
      })
    } catch (pixErr) {
      await db.payment.update({
        where: { id: payment.id },
        data:  { status: "FAILED" },
      })
      return NextResponse.json({ error: "Falha no pagamento Pix" }, { status: 502 })
    }

    // Register on blockchain
    let blockchainResult
    try {
      blockchainResult = await blockchain.registerPayment({
        paymentId:   payment.id,
        workerId:    timesheet.workerId,
        companyId,
        shiftId:     timesheet.shiftId,
        amountCents: Math.round(netAmount * 100),
        pixE2eId:    pixResult.e2eId,
      })
    } catch {
      console.warn("Blockchain registration failed, continuing without it")
    }

    // Update payment as PAID
    const updatedPayment = await db.payment.update({
      where: { id: payment.id },
      data: {
        status:           "PAID",
        pixE2eId:         pixResult.e2eId,
        paidAt:           new Date(),
        blockchainTxHash: blockchainResult?.txHash ?? null,
        blockchainBlock:  blockchainResult?.blockNumber ?? null,
      },
    })

    // Update worker earnings
    await db.worker.update({
      where: { id: timesheet.workerId },
      data: {
        totalEarnings: { increment: netAmount },
        totalShifts:   { increment: 1 },
      },
    })

    // Update company total shifts
    await db.company.update({
      where: { id: companyId },
      data:  { totalShifts: { increment: 1 } },
    })

    // Notify worker
    await db.notification.create({
      data: {
        userId: timesheet.worker.user.id ?? "",
        type:   "PAYMENT_SENT",
        title:  "Pagamento enviado ⚡",
        body:   `R$ ${netAmount.toFixed(2)} enviado via Pix para sua conta.`,
        data:   { paymentId: updatedPayment.id, amount: netAmount },
      },
    })

    return NextResponse.json({
      data: {
        ...updatedPayment,
        blockchainExplorerUrl: blockchainResult?.explorerUrl,
      },
    })
  } catch (err) {
    console.error("[POST /api/payments]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
