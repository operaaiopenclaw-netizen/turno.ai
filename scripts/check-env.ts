#!/usr/bin/env ts-node
// scripts/check-env.ts — valida todas as variáveis de ambiente antes do deploy
// Uso: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/check-env.ts

import * as dotenv from "dotenv"
import * as path  from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

type Var = { key: string; required: boolean; hint: string }

const VARS: Var[] = [
  // Banco
  { key: "DATABASE_URL",          required: true,  hint: "Supabase → Settings → Database → Connection String (porta 6543, pgbouncer=true)" },

  // Auth
  { key: "NEXTAUTH_SECRET",       required: true,  hint: "Gerar: openssl rand -base64 32" },
  { key: "AUTH_SECRET",           required: true,  hint: "Mesmo valor que NEXTAUTH_SECRET" },
  { key: "NEXTAUTH_URL",          required: true,  hint: "https://turno.ai (ou URL do Vercel)" },

  // Blockchain
  { key: "BLOCKCHAIN_PRIVATE_KEY",required: true,  hint: "Chave privada da wallet Polygon (sem 0x não é necessário)" },
  { key: "CONTRACT_ADDRESS",       required: false, hint: "Preencher APÓS rodar: npx hardhat run scripts/deploy.ts --network amoy" },
  { key: "BLOCKCHAIN_NETWORK",     required: true,  hint: '"amoy" para testnet | "mainnet" para produção' },
  { key: "AMOY_RPC_URL",           required: false, hint: "Default público OK: https://rpc-amoy.polygon.technology" },
  { key: "POLYGON_RPC_URL",        required: false, hint: "Default público OK: https://polygon-rpc.com" },

  // Celcoin PIX
  { key: "CELCOIN_BASE_URL",       required: false, hint: "Sandbox: https://sandbox.openfinance.celcoin.dev" },
  { key: "CELCOIN_CLIENT_ID",      required: false, hint: "Celcoin → Aplicações → Client ID (vazio = mock)" },
  { key: "CELCOIN_CLIENT_SECRET",  required: false, hint: "Celcoin → Aplicações → Client Secret" },

  // WhatsApp Z-API
  { key: "ZAPI_INSTANCE_ID",       required: false, hint: "app.z-api.io → Instâncias → ID (vazio = console.log)" },
  { key: "ZAPI_TOKEN",             required: false, hint: "app.z-api.io → Instâncias → Token" },

  // Email
  { key: "RESEND_API_KEY",         required: false, hint: "resend.com → API Keys (vazio = console.log)" },

  // KYC
  { key: "SERPRO_API_KEY",         required: false, hint: "servicos.serpro.gov.br/api-cpf (vazio = mock)" },
]

console.log("\n╔══════════════════════════════════════════════╗")
console.log("  🔍  turno.ai — Validação de Ambiente")
console.log("╚══════════════════════════════════════════════╝\n")

let errors = 0; let warnings = 0; let ok = 0

for (const v of VARS) {
  const val = process.env[v.key]
  if (!val || val.trim() === "") {
    if (v.required) {
      console.log(`  ❌ ${v.key}`)
      console.log(`     → ${v.hint}\n`)
      errors++
    } else {
      console.log(`  ⚠️  ${v.key} (opcional — mock ativo)`)
      warnings++
    }
  } else {
    const masked = val.length > 8 ? val.slice(0,4) + "****" + val.slice(-4) : "****"
    console.log(`  ✅ ${v.key} = ${masked}`)
    ok++
  }
}

console.log(`\n  ─────────────────────────────────────────────`)
console.log(`  ✅ ${ok} configuradas  |  ⚠️  ${warnings} opcionais ausentes  |  ❌ ${errors} obrigatórias faltando`)

if (errors > 0) {
  console.log(`\n  ⛔ ${errors} variável(is) obrigatória(s) faltando. Deploy bloqueado.\n`)
  process.exit(1)
} else {
  console.log(`\n  🚀 Ambiente pronto para deploy!\n`)
}
