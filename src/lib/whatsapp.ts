// src/lib/whatsapp.ts
// WhatsApp Business API via Z-API
// Em dev (sem credenciais): loga no console. Em prod: envia mensagem real.

export interface WhatsAppMessage {
  to:      string  // número com DDI: +5541999991234
  message: string
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("55")) return `+${digits}`
  if (digits.length >= 10) return `+55${digits}`
  return phone
}

class WhatsAppService {
  private apiUrl:     string
  private token:      string
  private instanceId: string

  constructor() {
    this.apiUrl     = process.env.ZAPI_BASE_URL    ?? ""
    this.token      = process.env.ZAPI_TOKEN       ?? ""
    this.instanceId = process.env.ZAPI_INSTANCE_ID ?? ""
  }

  async send({ to, message }: WhatsAppMessage): Promise<void> {
    const phone = normalizePhone(to)
    if (!this.token || !this.instanceId) {
      console.log(`[WhatsApp DEV] → ${phone}:\n${message}\n`)
      return
    }
    try {
      await fetch(
        `${this.apiUrl}/instances/${this.instanceId}/token/${this.token}/send-text`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ phone, message }),
        }
      )
    } catch (err) {
      console.error("[WhatsApp] send failed:", err)
    }
  }

  // ─── TEMPLATES ────────────────────────────────────────────────────────────

  async notifyNewShift(
    workerPhone: string,
    workerName: string,
    role: string,
    companyName: string,
    date: string,
    pay: number,
    neighborhood: string
  ) {
    await this.send({
      to:      workerPhone,
      message: `⚡ *Novo turno disponível, ${workerName.split(" ")[0]}!*\n\n` +
               `🎯 *${role}* na ${companyName}\n` +
               `📅 ${date} · 📍 ${neighborhood}, Curitiba\n` +
               `💰 R$ ${pay.toFixed(2)}\n\n` +
               `Acesse turno.ai para se candidatar 👉`,
    })
  }

  async notifyAccepted(
    workerPhone: string,
    workerName: string,
    role: string,
    companyName: string,
    date: string,
    startTime: string,
    address?: string
  ) {
    await this.send({
      to:      workerPhone,
      message: `✅ *Parabéns, ${workerName.split(" ")[0]}!*\n\n` +
               `Sua candidatura para *${role}* foi aprovada!\n\n` +
               `🏢 ${companyName}\n` +
               `📅 ${date} às ${startTime}\n` +
               (address ? `📍 ${address}\n` : "") +
               `\nFaça o check-in pelo app ao chegar. Bom turno! 🚀`,
    })
  }

  async notifyPaymentSent(
    workerPhone: string,
    workerName: string,
    amount: number,
    method: "PIX" | "WALLET"
  ) {
    const details = method === "WALLET"
      ? `O valor está disponível na sua *carteira Turno*.\nSaque via PIX quando quiser ou use seu cartão virtual 💳`
      : `O valor já deve estar disponível na sua conta bancária.`

    await this.send({
      to:      workerPhone,
      message: `⚡ *Pagamento recebido, ${workerName.split(" ")[0]}!*\n\n` +
               `Você recebeu *R$ ${amount.toFixed(2)}*.\n\n` +
               `${details}\n\nObrigado pelo excelente trabalho! 👏`,
    })
  }

  async notifyNewApplicant(
    companyPhone: string,
    workerName: string,
    role: string,
    rating: number
  ) {
    await this.send({
      to:      companyPhone,
      message: `👤 *Novo candidato para ${role}*\n\n` +
               `*${workerName}* se candidatou ao turno.\n` +
               `⭐ Avaliação: ${rating.toFixed(1)}/5.0\n\n` +
               `Acesse o painel Turno para ver o perfil e decidir 👉`,
    })
  }

  async notifyCheckinReminder(
    workerPhone: string,
    workerName: string,
    role: string,
    startTime: string,
    address: string
  ) {
    await this.send({
      to:      workerPhone,
      message: `⏰ *Lembrete, ${workerName.split(" ")[0]}!*\n\n` +
               `Seu turno de *${role}* começa às *${startTime}*.\n` +
               `📍 ${address}\n\n` +
               `Faça o check-in pelo app ao chegar! 📱`,
    })
  }

  async notifyDepositConfirmed(
    companyPhone: string,
    companyName: string,
    amount: number
  ) {
    await this.send({
      to:      companyPhone,
      message: `✅ *Depósito confirmado!*\n\n` +
               `R$ ${amount.toFixed(2)} foram creditados na carteira Turno de *${companyName}*.\n\n` +
               `Agora você pode pagar trabalhadores instantaneamente pelo app 🚀`,
    })
  }
}

export const whatsapp = new WhatsAppService()
