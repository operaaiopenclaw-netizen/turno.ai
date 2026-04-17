// src/lib/wallet.ts
// Serviço de carteira BRLC (stablecoin interna 1:1 com BRL)
// Empresas depositam BRL → BRLC via PIX. Workers recebem BRLC e podem sacar via PIX ou usar cartão virtual.

import { db } from "./db"
import { pix } from "./pix"
import { Decimal } from "@prisma/client/runtime/library"

export interface DepositResult {
  walletTxId: string
  qrCode: string
  pixKey: string
  amount: number
  expiresAt: string
}

export interface CashoutResult {
  walletTxId: string
  pixE2eId: string
  status: "PENDING" | "PAID"
}

export interface WalletBalance {
  available: number
  reserved: number
  totalIn: number
  totalOut: number
}

class WalletService {

  // Garante que o usuário tem carteira, criando se necessário
  async ensureWallet(userId: string) {
    return db.wallet.upsert({
      where:  { userId },
      update: {},
      create: { userId, balance: 0, reserved: 0, totalIn: 0, totalOut: 0 },
    })
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    const wallet = await db.wallet.findUnique({ where: { userId } })
    if (!wallet) return { available: 0, reserved: 0, totalIn: 0, totalOut: 0 }
    return {
      available: Number(wallet.balance),
      reserved:  Number(wallet.reserved),
      totalIn:   Number(wallet.totalIn),
      totalOut:  Number(wallet.totalOut),
    }
  }

  // Empresa inicia depósito: gera QR Code Pix e registra transação PENDING
  async initiateDeposit(userId: string, amount: number): Promise<DepositResult> {
    if (amount < 10) throw new Error("Depósito mínimo R$ 10,00")
    if (amount > 50000) throw new Error("Depósito máximo R$ 50.000,00 por operação")

    const wallet = await this.ensureWallet(userId)
    const txId   = `DEP-${userId.slice(-8)}-${Date.now()}`

    const qrCode = await pix.generateQRCode(amount, `Depósito Turno.ai — ${userId}`, txId)

    const tx = await db.walletTransaction.create({
      data: {
        walletId:    wallet.id,
        type:        "DEPOSIT_PIX",
        amount:      new Decimal(amount),
        fee:         new Decimal(0),
        netAmount:   new Decimal(amount),
        status:      "PENDING",
        reference:   txId,
        description: `Depósito via PIX R$ ${amount.toFixed(2)}`,
        meta:        { qrCode, expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
      },
    })

    return {
      walletTxId: tx.id,
      qrCode,
      pixKey:     process.env.CELCOIN_PIX_KEY ?? "turno@turno.ai",
      amount,
      expiresAt:  new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }
  }

  // Confirma depósito (chamado pelo webhook do Pix ou manualmente em dev)
  async confirmDeposit(walletTxId: string, pixE2eId: string) {
    const tx = await db.walletTransaction.findUnique({
      where:   { id: walletTxId },
      include: { wallet: true },
    })
    if (!tx) throw new Error("Transação não encontrada")
    if (tx.status === "CONFIRMED") return tx

    await db.$transaction([
      db.walletTransaction.update({
        where: { id: walletTxId },
        data:  { status: "CONFIRMED", reference: pixE2eId },
      }),
      db.wallet.update({
        where: { id: tx.walletId },
        data:  {
          balance: { increment: tx.netAmount },
          totalIn: { increment: tx.netAmount },
        },
      }),
    ])

    // Notifica empresa
    const wallet = await db.wallet.findUnique({
      where:   { id: tx.walletId },
      include: { user: true },
    })
    if (wallet?.userId) {
      await db.notification.create({
        data: {
          userId: wallet.userId,
          type:   "DEPOSIT_CONFIRMED",
          title:  "Depósito confirmado",
          body:   `R$ ${Number(tx.netAmount).toFixed(2)} disponíveis na sua carteira Turno`,
          data:   { walletTxId, amount: Number(tx.netAmount) },
        },
      })
    }

    return tx
  }

  // Empresa reserva valor para pagamento de turno (escrow)
  async lockEscrow(userId: string, amount: number, paymentId: string, description: string) {
    const wallet = await db.wallet.findUnique({ where: { userId } })
    if (!wallet) throw new Error("Carteira não encontrada")
    if (Number(wallet.balance) < amount) throw new Error("Saldo insuficiente")

    await db.$transaction([
      db.walletTransaction.create({
        data: {
          walletId:    wallet.id,
          type:        "ESCROW_LOCK",
          amount:      new Decimal(amount),
          fee:         new Decimal(0),
          netAmount:   new Decimal(amount),
          status:      "CONFIRMED",
          paymentId,
          description,
        },
      }),
      db.wallet.update({
        where: { id: wallet.id },
        data:  {
          balance:  { decrement: amount },
          reserved: { increment: amount },
        },
      }),
    ])
  }

  // Libera escrow para o worker após aprovação do timesheet
  async releaseEscrow(companyUserId: string, workerUserId: string, amount: number, fee: number, paymentId: string) {
    const companyWallet = await db.wallet.findUnique({ where: { userId: companyUserId } })
    const workerWallet  = await this.ensureWallet(workerUserId)

    if (!companyWallet) throw new Error("Carteira da empresa não encontrada")

    const netWorkerAmount = amount - fee

    await db.$transaction([
      // Debita escrow da empresa
      db.walletTransaction.create({
        data: {
          walletId:    companyWallet.id,
          type:        "ESCROW_RELEASE",
          amount:      new Decimal(amount),
          fee:         new Decimal(fee),
          netAmount:   new Decimal(amount),
          status:      "CONFIRMED",
          paymentId,
          description: `Pagamento liberado para worker`,
        },
      }),
      db.wallet.update({
        where: { id: companyWallet.id },
        data:  {
          reserved: { decrement: amount },
          totalOut: { increment: amount },
        },
      }),
      // Credita taxa para plataforma (registrada na empresa, sai do reservado)
      // Worker recebe valor líquido
      db.walletTransaction.create({
        data: {
          walletId:    workerWallet.id,
          type:        "ESCROW_RELEASE",
          amount:      new Decimal(netWorkerAmount),
          fee:         new Decimal(0),
          netAmount:   new Decimal(netWorkerAmount),
          status:      "CONFIRMED",
          paymentId,
          description: `Pagamento turno recebido`,
        },
      }),
      db.wallet.update({
        where: { id: workerWallet.id },
        data:  {
          balance: { increment: netWorkerAmount },
          totalIn: { increment: netWorkerAmount },
        },
      }),
    ])

    return { netWorkerAmount, fee }
  }

  // Worker saca saldo para PIX
  async cashoutPix(workerUserId: string, amount: number, pixKey: string, pixKeyType: string, workerName: string): Promise<{ walletTxId: string; pixE2eId: string; status: string }> {
    if (amount < 5) throw new Error("Saque mínimo R$ 5,00")

    const wallet = await db.wallet.findUnique({ where: { userId: workerUserId } })
    if (!wallet) throw new Error("Carteira não encontrada")
    if (Number(wallet.balance) < amount) throw new Error("Saldo insuficiente")

    // Reserva o valor enquanto processa
    const tx = await db.$transaction(async (prisma) => {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data:  { balance: { decrement: amount } },
      })
      return prisma.walletTransaction.create({
        data: {
          walletId:    wallet.id,
          type:        "CASHOUT_PIX",
          amount:      new Decimal(amount),
          fee:         new Decimal(0),
          netAmount:   new Decimal(amount),
          status:      "PENDING",
          description: `Saque PIX R$ ${amount.toFixed(2)}`,
        },
      })
    })

    try {
      const result = await pix.sendPayment({
        amount,
        pixKey,
        pixKeyType: pixKeyType as "CPF" | "EMAIL" | "PHONE" | "RANDOM",
        description: "Turno.ai — pagamento de trabalho",
        externalId:  tx.id,
        recipientName: workerName,
      })

      await db.$transaction([
        db.walletTransaction.update({
          where: { id: tx.id },
          data: {
            status:    result.status === "PAID" ? "CONFIRMED" : "PENDING",
            reference: result.e2eId,
          },
        }),
        db.wallet.update({
          where: { id: wallet.id },
          data:  { totalOut: { increment: amount } },
        }),
      ])

      await db.notification.create({
        data: {
          userId: workerUserId,
          type:   "WALLET_CASHOUT",
          title:  "Saque enviado",
          body:   `R$ ${amount.toFixed(2)} enviados para sua chave PIX`,
          data:   { amount, pixKey, e2eId: result.e2eId },
        },
      })

      return { walletTxId: tx.id, pixE2eId: result.e2eId, status: result.status }
    } catch (err) {
      // Reverte o débito se o Pix falhar
      await db.$transaction([
        db.wallet.update({
          where: { id: wallet.id },
          data:  { balance: { increment: amount } },
        }),
        db.walletTransaction.update({
          where: { id: tx.id },
          data:  { status: "FAILED" },
        }),
      ])
      throw err
    }
  }

  // Emite cartão virtual para worker
  async requestVirtualCard(workerUserId: string) {
    const wallet = await this.ensureWallet(workerUserId)
    const existing = await db.virtualCard.findUnique({ where: { walletId: wallet.id } })
    if (existing && existing.status !== "CANCELLED") {
      return existing
    }

    const now = new Date()
    const expiryYear  = now.getFullYear() + 4
    const expiryMonth = now.getMonth() + 1
    const last4 = String(Math.floor(1000 + Math.random() * 9000))

    return db.virtualCard.upsert({
      where:  { walletId: wallet.id },
      update: { last4, expiryYear, expiryMonth, status: "ACTIVE" },
      create: {
        walletId:   wallet.id,
        last4,
        expiryMonth,
        expiryYear,
        status:     "ACTIVE",
        limitDaily: new Decimal(500),
      },
    })
  }

  async getTransactions(userId: string, limit = 20) {
    const wallet = await db.wallet.findUnique({ where: { userId } })
    if (!wallet) return []
    return db.walletTransaction.findMany({
      where:   { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take:    limit,
    })
  }
}

export const walletService = new WalletService()
