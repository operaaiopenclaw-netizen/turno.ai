// src/lib/whatsapp.ts
// WhatsApp Business API via Z-API or Twilio
// Em dev: loga no console. Em prod: envia mensagem real.

export interface WhatsAppMessage {
  to:      string   // número com DDI: +5541999991234
  message: string
}

class WhatsAppService {
  private apiUrl: string
  private token:  string
  private instanceId: string

  constructor() {
    this.apiUrl     = process.env.ZAPI_BASE_URL     ?? ""
    this.token      = process.env.ZAPI_TOKEN        ?? ""
    this.instanceId = process.env.ZAPI_INSTANCE_ID  ?? ""
  }

  async send({ to, message }: WhatsAppMessage): Promise<void> {
    // Dev mode: just log
    if (!this.token || !this.instanceId) {
      console.log(`[WhatsApp DEV] → ${to}: ${message}`)
      return
    }

    try {
      await fetch(`${this.apiUrl}/instances/${this.instanceId}/token/${this.token}/send-text`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: to, message }),
      })
    } catch (err) {
      console.error("[WhatsApp] Failed to send:", err)
    }
  }

  // ─── TEMPLATE MESSAGES ───────────────────────────────────────────────────
  async notifyNewShift(workerPhone: string, workerName: string, shift: {
    role: string; company: string; date: string; pay: number; neighborhood: string
  }) {
    await this.send({
      to: workerPhone,
      message: `⚡ *Novo turno disponível, ${workerName.split(" ")[0]}!*\n\n` +
        `🎯 *${shift.role}* na ${shift.company}\n` +
        `📅 ${shift.date}\n` +
        `📍 ${shift.neighborhood}, Curitiba\n` +
        `💰 R$ ${shift.pay.toFixed(2)}\n\n` +
        `Acesse o app Turno para se candidatar 👉`,
    })
  }

  async notifyAccepted(workerPhone: string, workerName: string, shift: {
    role: string; company: string; date: string; startTime: string; address?: string
  }) {
    await this.send({
      to: workerPhone,
      message: `✅ *Parabéns, ${workerName.split(" ")[0]}!*\n\n` +
        `Sua candidatura para *${shift.role}* foi aprovada!\n\n` +
        `🏢 ${shift.company}\n` +
        `📅 ${shift.date} às ${shift.startTime}\n` +
        (shift.address ? `📍 ${shift.address}\n` : "") +
        `\nLembre-se de fazer o check-in no app ao chegar. Bom turno! 🚀`,
    })
  }

  async notifyPaymentSent(workerPhone: string, workerName: string, amount: number) {
    await this.send({
      to: workerPhone,
      message: `⚡ *Pix enviado, ${workerName.split(" ")[0]}!*\n\n` +
        `Você recebeu *R$ ${amount.toFixed(2)}* via Pix.\n\n` +
        `O valor já deve estar disponível na sua conta. Obrigado pelo excelente trabalho! 👏`,
    })
  }

  async notifyNewApplicant(companyPhone: string, workerName: string, role: string, rating: number) {
    await this.send({
      to: companyPhone,
      message: `👤 *Novo candidato para ${role}*\n\n` +
        `*${workerName}* se candidatou ao turno.\n` +
        `⭐ Avaliação: ${rating.toFixed(1)}/5.0\n\n` +
        `Acesse o painel Turno para ver o perfil e decidir 👉`,
    })
  }

  async notifyCheckinReminder(workerPhone: string, workerName: string, startTime: string) {
    await this.send({
      to: workerPhone,
      message: `⏰ *Lembrete de turno, ${workerName.split(" ")[0]}!*\n\n` +
        `Seu turno começa às *${startTime}*.\n` +
        `Não esqueça de fazer o check-in pelo app ao chegar! 📍`,
    })
  }
}

export const whatsapp = new WhatsAppService()
