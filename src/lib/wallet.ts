// src/lib/wallet.ts
import { supa } from "./supabase"
import { pix } from "./pix"

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

  async ensureWallet(userId: string) {
    const { data: existing } = await supa.from("Wallet").select("*").eq("userId", userId).single()
    if (existing) return existing
    const id = crypto.randomUUID()
    await supa.from("Wallet").insert({ id, userId, balance: 0, reserved: 0, totalIn: 0, totalOut: 0, updatedAt: new Date().toISOString() })
    const { data } = await supa.from("Wallet").select("*").eq("userId", userId).single()
    return data
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    const { data: wallet } = await supa.from("Wallet").select("balance, reserved, totalIn, totalOut").eq("userId", userId).single()
    if (!wallet) return { available: 0, reserved: 0, totalIn: 0, totalOut: 0 }
    return {
      available: Number(wallet.balance),
      reserved:  Number(wallet.reserved),
      totalIn:   Number(wallet.totalIn),
      totalOut:  Number(wallet.totalOut),
    }
  }

  async initiateDeposit(userId: string, amount: number): Promise<DepositResult> {
    if (amount < 10) throw new Error("Depósito mínimo R$ 10,00")
    if (amount > 50000) throw new Error("Depósito máximo R$ 50.000,00 por operação")

    const wallet = await this.ensureWallet(userId)
    const txId   = `DEP-${userId.slice(-8)}-${Date.now()}`
    const qrCode = await pix.generateQRCode(amount, `Depósito Turno.ai — ${userId}`, txId)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const { data: tx } = await supa.from("WalletTransaction").insert({
      id:          crypto.randomUUID(),
      walletId:    wallet.id,
      type:        "DEPOSIT_PIX",
      amount,
      fee:         0,
      netAmount:   amount,
      status:      "PENDING",
      reference:   txId,
      description: `Depósito via PIX R$ ${amount.toFixed(2)}`,
      meta:        { qrCode, expiresAt },
      updatedAt:   new Date().toISOString(),
    }).select().single()

    return {
      walletTxId: tx!.id,
      qrCode,
      pixKey:     process.env.CELCOIN_PIX_KEY ?? "turno@turno.ai",
      amount,
      expiresAt,
    }
  }

  async confirmDeposit(walletTxId: string, pixE2eId: string) {
    const { data: tx } = await supa.from("WalletTransaction").select("*, Wallet(*)").eq("id", walletTxId).single()
    if (!tx) throw new Error("Transação não encontrada")
    if (tx.status === "CONFIRMED") return tx

    await supa.from("WalletTransaction").update({ status: "CONFIRMED", reference: pixE2eId, updatedAt: new Date().toISOString() }).eq("id", walletTxId)

    const { data: wallet } = await supa.from("Wallet").select("balance, totalIn").eq("id", tx.walletId).single()
    if (wallet) {
      await supa.from("Wallet").update({
        balance: Number(wallet.balance) + Number(tx.netAmount),
        totalIn: Number(wallet.totalIn) + Number(tx.netAmount),
        updatedAt: new Date().toISOString(),
      }).eq("id", tx.walletId)
    }

    const { data: w } = await supa.from("Wallet").select("userId").eq("id", tx.walletId).single()
    if (w?.userId) {
      await supa.from("Notification").insert({
        id:        crypto.randomUUID(),
        userId:    w.userId,
        type:      "DEPOSIT_CONFIRMED",
        title:     "Depósito confirmado",
        body:      `R$ ${Number(tx.netAmount).toFixed(2)} disponíveis na sua carteira Turno`,
        data:      { walletTxId, amount: Number(tx.netAmount) },
        read:      false,
        createdAt: new Date().toISOString(),
      })
    }

    return tx
  }

  async lockEscrow(userId: string, amount: number, paymentId: string, description: string) {
    const { data: wallet } = await supa.from("Wallet").select("id, balance, reserved").eq("userId", userId).single()
    if (!wallet) throw new Error("Carteira não encontrada")
    if (Number(wallet.balance) < amount) throw new Error("Saldo insuficiente")

    await supa.from("WalletTransaction").insert({
      id: crypto.randomUUID(), walletId: wallet.id, type: "ESCROW_LOCK",
      amount, fee: 0, netAmount: amount, status: "CONFIRMED", paymentId, description,
      updatedAt: new Date().toISOString(),
    })
    await supa.from("Wallet").update({
      balance:   Number(wallet.balance) - amount,
      reserved:  Number(wallet.reserved) + amount,
      updatedAt: new Date().toISOString(),
    }).eq("id", wallet.id)
  }

  async releaseEscrow(companyUserId: string, workerUserId: string, amount: number, fee: number, paymentId: string) {
    const { data: companyWallet } = await supa.from("Wallet").select("id, reserved, totalOut").eq("userId", companyUserId).single()
    if (!companyWallet) throw new Error("Carteira da empresa não encontrada")
    const workerWallet = await this.ensureWallet(workerUserId)
    const netWorkerAmount = amount - fee

    await supa.from("WalletTransaction").insert({
      id: crypto.randomUUID(), walletId: companyWallet.id, type: "ESCROW_RELEASE",
      amount, fee, netAmount: amount, status: "CONFIRMED", paymentId,
      description: "Pagamento liberado para worker", updatedAt: new Date().toISOString(),
    })
    await supa.from("Wallet").update({
      reserved: Number(companyWallet.reserved) - amount,
      totalOut: Number(companyWallet.totalOut) + amount,
      updatedAt: new Date().toISOString(),
    }).eq("id", companyWallet.id)

    const { data: ww } = await supa.from("Wallet").select("balance, totalIn").eq("id", workerWallet.id).single()
    await supa.from("WalletTransaction").insert({
      id: crypto.randomUUID(), walletId: workerWallet.id, type: "ESCROW_RELEASE",
      amount: netWorkerAmount, fee: 0, netAmount: netWorkerAmount, status: "CONFIRMED", paymentId,
      description: "Pagamento turno recebido", updatedAt: new Date().toISOString(),
    })
    await supa.from("Wallet").update({
      balance: Number(ww?.balance ?? 0) + netWorkerAmount,
      totalIn: Number(ww?.totalIn ?? 0) + netWorkerAmount,
      updatedAt: new Date().toISOString(),
    }).eq("id", workerWallet.id)

    return { netWorkerAmount, fee }
  }

  async cashoutPix(workerUserId: string, amount: number, pixKey: string, pixKeyType: string, workerName: string) {
    if (amount < 5) throw new Error("Saque mínimo R$ 5,00")

    const { data: wallet } = await supa.from("Wallet").select("id, balance, totalOut").eq("userId", workerUserId).single()
    if (!wallet) throw new Error("Carteira não encontrada")
    if (Number(wallet.balance) < amount) throw new Error("Saldo insuficiente")

    await supa.from("Wallet").update({ balance: Number(wallet.balance) - amount, updatedAt: new Date().toISOString() }).eq("id", wallet.id)
    const { data: tx } = await supa.from("WalletTransaction").insert({
      id: crypto.randomUUID(), walletId: wallet.id, type: "CASHOUT_PIX",
      amount, fee: 0, netAmount: amount, status: "PENDING",
      description: `Saque PIX R$ ${amount.toFixed(2)}`, updatedAt: new Date().toISOString(),
    }).select().single()

    try {
      const result = await pix.sendPayment({
        amount, pixKey,
        pixKeyType: pixKeyType as "CPF" | "EMAIL" | "PHONE" | "RANDOM",
        description: "Turno.ai — pagamento de trabalho",
        externalId: tx!.id,
        recipientName: workerName,
      })

      await supa.from("WalletTransaction").update({
        status: result.status === "PAID" ? "CONFIRMED" : "PENDING",
        reference: result.e2eId,
        updatedAt: new Date().toISOString(),
      }).eq("id", tx!.id)
      await supa.from("Wallet").update({ totalOut: Number(wallet.totalOut) + amount, updatedAt: new Date().toISOString() }).eq("id", wallet.id)
      await supa.from("Notification").insert({
        id: crypto.randomUUID(), userId: workerUserId, type: "WALLET_CASHOUT",
        title: "Saque enviado", body: `R$ ${amount.toFixed(2)} enviados para sua chave PIX`,
        data: { amount, pixKey, e2eId: result.e2eId }, read: false, createdAt: new Date().toISOString(),
      })

      return { walletTxId: tx!.id, pixE2eId: result.e2eId, status: result.status }
    } catch (err) {
      await supa.from("Wallet").update({ balance: Number(wallet.balance), updatedAt: new Date().toISOString() }).eq("id", wallet.id)
      await supa.from("WalletTransaction").update({ status: "FAILED", updatedAt: new Date().toISOString() }).eq("id", tx!.id)
      throw err
    }
  }

  async requestVirtualCard(workerUserId: string) {
    const wallet = await this.ensureWallet(workerUserId)
    const { data: existing } = await supa.from("VirtualCard").select("*").eq("walletId", wallet.id).single()
    if (existing && existing.status !== "CANCELLED") return existing

    const now = new Date()
    const last4 = String(Math.floor(1000 + Math.random() * 9000))
    const cardData = {
      walletId: wallet.id, last4,
      expiryMonth: now.getMonth() + 1,
      expiryYear: now.getFullYear() + 4,
      status: "ACTIVE", limitDaily: 500,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await supa.from("VirtualCard").update({ ...cardData }).eq("walletId", wallet.id)
    } else {
      await supa.from("VirtualCard").insert({ id: crypto.randomUUID(), ...cardData })
    }
    const { data } = await supa.from("VirtualCard").select("*").eq("walletId", wallet.id).single()
    return data
  }

  async getTransactions(userId: string, limit = 20) {
    const { data: wallet } = await supa.from("Wallet").select("id").eq("userId", userId).single()
    if (!wallet) return []
    const { data } = await supa.from("WalletTransaction").select("*").eq("walletId", wallet.id).order("createdAt", { ascending: false }).limit(limit)
    return data ?? []
  }
}

export const walletService = new WalletService()
