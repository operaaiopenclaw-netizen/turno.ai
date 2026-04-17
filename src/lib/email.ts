// src/lib/email.ts
// Email service via Resend (https://resend.com). Mock in dev (console.log).

interface EmailParams {
  to: string
  subject: string
  html: string
}

class EmailService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY ?? ""
  }

  async send({ to, subject, html }: EmailParams): Promise<void> {
    if (!this.apiKey) {
      console.log(`[Email DEV] → ${to}: ${subject}`)
      return
    }
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Turno.ai <noreply@turno.ai>",
          to,
          subject,
          html,
        }),
      })
    } catch (err) {
      console.error("[EmailService.send]", err)
    }
  }

  async welcomeWorker(email: string, name: string): Promise<void> {
    const firstName = name.split(" ")[0]
    await this.send({
      to: email,
      subject: "Bem-vindo(a) à Turno.ai! 🚀",
      html: `<h2>Olá, ${firstName}!</h2><p>Sua conta foi criada com sucesso. Explore os turnos disponíveis em <a href="https://turno.ai">turno.ai</a>.</p>`,
    })
  }

  async paymentConfirmed(email: string, name: string, amount: number): Promise<void> {
    const firstName = name.split(" ")[0]
    await this.send({
      to: email,
      subject: `⚡ Pagamento de R$ ${amount.toFixed(2)} enviado`,
      html: `<h2>Pagamento confirmado!</h2><p>Olá ${firstName}, você recebeu <strong>R$ ${amount.toFixed(2)}</strong>.</p>`,
    })
  }
}

export const emailService = new EmailService()
