// src/app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supa } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { pix } from "@/lib/pix"
import { blockchain } from "@/lib/blockchain"
import { walletService } from "@/lib/wallet"
import { calcPlatformFee, calcNetAmount } from "@/lib/utils"

export async function GET(req: NextRequest) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    const workerId  = (session?.user as any)?.workerId

    let query = supa
      .from("Payment")
      .select("*, Shift(role, date, neighborhood), Application(*, Worker(*, User(name)))")
      .order("createdAt", { ascending: false })
      .limit(100)

    if (companyId) {
      const { data: shifts } = await supa.from("Shift").select("id").eq("companyId", companyId)
      const ids = (shifts ?? []).map((s: any) => s.id)
      if (ids.length === 0) return NextResponse.json({ data: [] })
      query = query.in("shiftId", ids)
    }
    if (workerId) {
      const { data: apps } = await supa.from("Application").select("id").eq("workerId", workerId)
      const ids = (apps ?? []).map((a: any) => a.id)
      if (ids.length === 0) return NextResponse.json({ data: [] })
      query = query.in("applicationId", ids)
    }

    const { data: payments } = await query
    return NextResponse.json({ data: payments ?? [] })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session   = await auth()
    const companyId = (session?.user as any)?.companyId
    if (!companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { timesheetId, useWallet } = await req.json()
    if (!timesheetId) return NextResponse.json({ error: "timesheetId obrigatório" }, { status: 400 })

    const { data: timesheet } = await supa
      .from("Timesheet")
      .select("*, Shift(id, companyId, role, date, totalPay), Application(id), Worker(id, pixKey, pixKeyType, User(id, name))")
      .eq("id", timesheetId)
      .single()

    if (!timesheet) return NextResponse.json({ error: "Timesheet não encontrado" }, { status: 404 })

    const shift       = (timesheet as any).Shift
    const worker      = (timesheet as any).Worker
    const application = (timesheet as any).Application

    if (shift?.companyId !== companyId) return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    if (timesheet.status !== "APPROVED") return NextResponse.json({ error: "Timesheet precisa ser aprovado primeiro" }, { status: 400 })

    const { data: existingPayment } = await supa.from("Payment").select("id, status").eq("applicationId", application?.id ?? "").single()
    if (existingPayment?.status === "PAID") return NextResponse.json({ error: "Já pago" }, { status: 400 })

    const amount       = shift?.totalPay ?? 0
    const fee          = calcPlatformFee(amount)
    const net          = calcNetAmount(amount)
    const workerName   = worker?.User?.name ?? "Trabalhador"
    const workerUserId = worker?.User?.id

    let paymentId: string
    if (existingPayment) {
      await supa.from("Payment").update({ status: "PROCESSING", updatedAt: new Date().toISOString() }).eq("id", existingPayment.id)
      paymentId = existingPayment.id
    } else {
      const newId = crypto.randomUUID()
      await supa.from("Payment").insert({
        id: newId, shiftId: timesheet.shiftId, applicationId: application?.id,
        timesheetId, amount, platformFee: fee, netAmount: net,
        pixKey: worker?.pixKey ?? null, pixKeyType: worker?.pixKeyType ?? null,
        status: "PROCESSING", updatedAt: new Date().toISOString(),
      })
      paymentId = newId
    }

    let pixE2eId       = ""
    let settlementType = "PIX"
    let blockchainResult: any

    if (useWallet) {
      try {
        settlementType = "WALLET"
        const { data: company } = await supa.from("Company").select("userId").eq("id", companyId).single()
        if (!company) throw new Error("Empresa não encontrada")
        await walletService.releaseEscrow(company.userId, workerUserId, amount, fee, paymentId)
      } catch (err) {
        await supa.from("Payment").update({ status: "FAILED", updatedAt: new Date().toISOString() }).eq("id", paymentId)
        return NextResponse.json({ error: (err as Error).message }, { status: 400 })
      }
    } else {
      const pixKey = worker?.pixKey
      if (!pixKey) {
        await supa.from("Payment").update({ status: "FAILED", updatedAt: new Date().toISOString() }).eq("id", paymentId)
        return NextResponse.json({ error: "Trabalhador sem chave PIX cadastrada" }, { status: 400 })
      }

      try {
        const pixResult = await pix.sendPayment({
          amount: net, pixKey,
          pixKeyType: (worker?.pixKeyType ?? "EMAIL") as "CPF" | "EMAIL" | "PHONE" | "RANDOM",
          description: `Turno ${shift?.role} — ${new Date(shift?.date).toLocaleDateString("pt-BR")}`,
          externalId: paymentId, recipientName: workerName,
        })
        pixE2eId = pixResult.e2eId

        const { data: wkr } = await supa.from("Worker").select("totalEarnings, totalShifts").eq("id", worker?.id).single()
        if (wkr) {
          await supa.from("Worker").update({
            totalEarnings: Number(wkr.totalEarnings) + net,
            totalShifts: Number(wkr.totalShifts) + 1,
            updatedAt: new Date().toISOString(),
          }).eq("id", worker?.id)
        }
      } catch {
        await supa.from("Payment").update({ status: "FAILED", updatedAt: new Date().toISOString() }).eq("id", paymentId)
        return NextResponse.json({ error: "Falha no pagamento Pix" }, { status: 502 })
      }
    }

    try {
      blockchainResult = await blockchain.registerPayment({
        paymentId, workerId: worker?.id, companyId, shiftId: timesheet.shiftId,
        amountCents: Math.round(net * 100), pixE2eId, settlementType,
      })
    } catch { /* best-effort */ }

    await supa.from("Payment").update({
      status: "PAID", pixE2eId: pixE2eId || null, paidAt: new Date().toISOString(),
      blockchainTxHash: blockchainResult?.txHash ?? null,
      blockchainBlock: blockchainResult?.blockNumber ?? null,
      blockchainNetwork: blockchainResult?.network ?? null,
      walletTxId: settlementType === "WALLET" ? paymentId : null,
      updatedAt: new Date().toISOString(),
    }).eq("id", paymentId)

    const { data: pendingTS } = await supa.from("Timesheet").select("id").eq("shiftId", timesheet.shiftId).neq("status", "APPROVED")
    if ((pendingTS ?? []).length === 0) {
      await supa.from("Shift").update({ status: "COMPLETED", updatedAt: new Date().toISOString() }).eq("id", timesheet.shiftId)
      const { data: cmpny } = await supa.from("Company").select("totalShifts").eq("id", companyId).single()
      if (cmpny) {
        await supa.from("Company").update({ totalShifts: Number(cmpny.totalShifts) + 1, updatedAt: new Date().toISOString() }).eq("id", companyId)
      }
    }

    if (workerUserId) {
      await supa.from("Notification").insert({
        id: crypto.randomUUID(), userId: workerUserId, type: "PAYMENT_SENT",
        title: "Pagamento recebido ⚡",
        body: settlementType === "WALLET"
          ? `R$ ${net.toFixed(2)} adicionados à sua carteira Turno`
          : `R$ ${net.toFixed(2)} enviados via PIX para sua conta`,
        data: { paymentId, amount: net, settlementType, txHash: blockchainResult?.txHash, explorerUrl: blockchainResult?.explorerUrl },
        read: false, createdAt: new Date().toISOString(),
      })
    }

    const { data: updatedPayment } = await supa.from("Payment").select("*").eq("id", paymentId).single()
    return NextResponse.json({ data: { ...updatedPayment, settlementType, explorerUrl: blockchainResult?.explorerUrl } })
  } catch (err) {
    console.error("[POST /api/payments]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
