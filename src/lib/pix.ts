// src/lib/pix.ts
// Pix integration via Celcoin API
// Docs: https://developers.celcoin.com.br/

export interface PixPaymentRequest {
  amount: number           // em reais
  pixKey: string
  pixKeyType: "CPF" | "EMAIL" | "PHONE" | "RANDOM"
  description: string
  externalId: string       // nosso ID de pagamento
  recipientName: string
}

export interface PixPaymentResponse {
  e2eId: string            // ID fim-a-fim do Banco Central
  status: "PENDING" | "PAID" | "FAILED"
  qrCode?: string
  qrCodeImage?: string
  txId: string
  createdAt: string
}

export interface PixKeyInfo {
  key: string
  keyType: string
  name: string
  taxId: string            // CPF/CNPJ mascarado
  bankName: string
  agency?: string
  account?: string
}

class PixService {
  private baseUrl: string
  private clientId: string
  private clientSecret: string
  private token: string | null = null
  private tokenExpiry: Date | null = null

  constructor() {
    this.baseUrl    = process.env.CELCOIN_BASE_URL    ?? "https://sandbox.openfinance.celcoin.dev"
    this.clientId    = process.env.CELCOIN_CLIENT_ID    ?? ""
    this.clientSecret= process.env.CELCOIN_CLIENT_SECRET ?? ""
  }

  // Autenticação OAuth2
  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token
    }

    const res = await fetch(`${this.baseUrl}/v5/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     this.clientId,
        client_secret: this.clientSecret,
      }),
    })

    if (!res.ok) throw new Error("Falha na autenticação Celcoin")

    const data = await res.json()
    this.token  = data.access_token
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000 - 60000)
    return this.token!
  }

  // Consultar chave Pix
  async lookupKey(key: string): Promise<PixKeyInfo> {
    // Em desenvolvimento, retorna mock
    if (process.env.NODE_ENV !== "production" || !this.clientId) {
      return this.mockLookup(key)
    }

    const token = await this.getToken()
    const res = await fetch(`${this.baseUrl}/v5/pix/dict/entry/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) throw new Error("Chave Pix não encontrada")
    return res.json()
  }

  // Enviar pagamento Pix
  async sendPayment(req: PixPaymentRequest): Promise<PixPaymentResponse> {
    // Em desenvolvimento, retorna mock
    if (process.env.NODE_ENV !== "production" || !this.clientId) {
      return this.mockPayment(req)
    }

    const token = await this.getToken()
    const res = await fetch(`${this.baseUrl}/v5/transactions/pix/payment`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount:         req.amount,
        clientCode:     req.externalId,
        endToEndId:     `E${Date.now()}`,
        transactionIdentification: req.externalId,
        creditParty: {
          key:    req.pixKey,
          name:   req.recipientName,
          taxId:  req.pixKey, // será normalizado pela API
          keyType: req.pixKeyType,
          bank:   "",
          agency: "",
          account: "",
          accountType: "CACC",
        },
        debitParty: {
          account: process.env.CELCOIN_ACCOUNT ?? "",
          bank:    "507",
          agency:  "0001",
          name:    "Turno Plataforma LTDA",
          taxId:   process.env.CELCOIN_CNPJ ?? "",
          accountType: "CACC",
        },
        remittanceInformation: req.description,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message ?? "Falha no pagamento Pix")
    }

    const data = await res.json()
    return {
      e2eId:   data.endToEndId,
      status:  data.status === "PAID" ? "PAID" : "PENDING",
      txId:    data.transactionIdentification,
      createdAt: new Date().toISOString(),
    }
  }

  // Gerar QR Code Pix para cobrança
  async generateQRCode(amount: number, description: string, txId: string): Promise<string> {
    if (process.env.NODE_ENV !== "production" || !this.clientId) {
      return `00020126580014BR.GOV.BCB.PIX0136${txId}5204000053039865802BR5925Turno Plataforma LTDA6009Curitiba62290525${txId}63040DA2`
    }

    const token = await this.getToken()
    const res = await fetch(`${this.baseUrl}/v5/transactions/pix/qrcode/static`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        key:     process.env.CELCOIN_PIX_KEY,
        txid:    txId,
        payerRequest: description,
      }),
    })

    const data = await res.json()
    return data.emv ?? ""
  }

  // ─── MOCKS ──────────────────────────────────────────────────────────────
  private mockLookup(key: string): PixKeyInfo {
    return {
      key,
      keyType: key.includes("@") ? "EMAIL" : "CPF",
      name: "Nome do Recebedor",
      taxId: "***.***.***-**",
      bankName: "Banco do Brasil",
    }
  }

  private mockPayment(req: PixPaymentRequest): PixPaymentResponse {
    const e2eId = `E00507${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    return {
      e2eId,
      status:    "PAID",
      txId:      req.externalId,
      createdAt: new Date().toISOString(),
    }
  }
}

export const pix = new PixService()
