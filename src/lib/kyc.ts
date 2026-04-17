// src/lib/kyc.ts
// Serpro CPF verification (https://servicos.serpro.gov.br/)
// Dev mock: passes if CPF has 11 digits (formal validation already done upstream).
// Prod: hits the Serpro gateway with Bearer token + jwt header.

export async function verifyCPF(cpf: string, _name?: string): Promise<boolean> {
  const digits = cpf.replace(/\D/g, "")

  if (!process.env.SERPRO_TOKEN) {
    // dev mock: rely on previous validateCPF call; just check length
    return digits.length === 11
  }

  try {
    const res = await fetch(
      `https://apigateway.serpro.gov.br/consulta-cpf-df/v1/cpf/${digits}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SERPRO_TOKEN}`,
          jwt: process.env.SERPRO_JWT ?? "",
        },
      },
    )
    return res.ok
  } catch {
    return false
  }
}
