// src/lib/contract.ts
import { supa } from "./supabase"

export interface ContractData {
  companyLegalName: string
  companyCNPJ:      string
  companyAddress:   string
  workerName:       string
  workerCPF:        string
  workerAddress?:   string
  role:             string
  shiftDate:        string
  startTime:        string
  endTime:          string
  hours:            number
  totalPay:         number
  generatedAt:      Date
  contractId:       string
}

export function generateContractHTML(data: ContractData): string {
  const {
    companyLegalName, companyCNPJ, companyAddress,
    workerName, workerCPF, workerAddress,
    role, shiftDate, startTime, endTime, hours, totalPay,
    generatedAt, contractId,
  } = data

  const hourlyRate       = (totalPay / hours).toFixed(2)
  const fgts             = (totalPay * 0.08).toFixed(2)
  const inss             = (totalPay * 0.075).toFixed(2)
  const ferias           = (totalPay / 12).toFixed(2)
  const decimoTerceiro   = (totalPay / 12).toFixed(2)
  const totalBruto       = totalPay.toFixed(2)
  const totalEncargos    = (parseFloat(fgts) + parseFloat(inss) + parseFloat(ferias) + parseFloat(decimoTerceiro)).toFixed(2)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato de Trabalho Intermitente — ${contractId}</title>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; color: #111; margin: 40px; }
  h1 { text-align: center; font-size: 14pt; text-transform: uppercase; margin-bottom: 4px; }
  h2 { font-size: 12pt; text-decoration: underline; margin-top: 24px; }
  .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #111; padding-bottom: 12px; }
  .clause { margin-bottom: 16px; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  td, th { border: 1px solid #333; padding: 6px 10px; font-size: 11pt; }
  th { background: #eee; font-weight: bold; }
  .footer { margin-top: 48px; }
  .signature { display: inline-block; width: 45%; text-align: center; border-top: 1px solid #111; padding-top: 8px; margin-top: 48px; }
  .signature + .signature { margin-left: 9%; }
  .meta { font-size: 9pt; color: #666; text-align: right; margin-top: 32px; }
</style>
</head>
<body>
<div class="header">
  <h1>Contrato de Trabalho Intermitente</h1>
  <p>Art. 443, §3°, da CLT — Contrato nº ${contractId}</p>
</div>
<div class="clause">EMPREGADOR:</div>
<table>
  <tr><th>Razão Social</th><td>${companyLegalName}</td></tr>
  <tr><th>CNPJ</th><td>${companyCNPJ}</td></tr>
  <tr><th>Endereço</th><td>${companyAddress}</td></tr>
</table>
<div class="clause">EMPREGADO(A):</div>
<table>
  <tr><th>Nome</th><td>${workerName}</td></tr>
  <tr><th>CPF</th><td>${workerCPF}</td></tr>
  ${workerAddress ? `<tr><th>Endereço</th><td>${workerAddress}</td></tr>` : ""}
</table>
<h2>CLÁUSULA 1ª — OBJETO</h2>
<div class="clause">Contrato de Trabalho Intermitente para a função de <strong>${role}</strong>, nos termos da CLT art. 452-A.</div>
<h2>CLÁUSULA 2ª — PERÍODO DO TURNO</h2>
<table>
  <tr><th>Data</th><td>${shiftDate}</td></tr>
  <tr><th>Início</th><td>${startTime}</td></tr>
  <tr><th>Término</th><td>${endTime}</td></tr>
  <tr><th>Total de horas</th><td>${hours}h</td></tr>
</table>
<h2>CLÁUSULA 3ª — REMUNERAÇÃO</h2>
<table>
  <tr><th>Valor por hora</th><td>R$ ${hourlyRate}</td></tr>
  <tr><th>Total bruto</th><td>R$ ${totalBruto}</td></tr>
  <tr><th>FGTS (8%)</th><td>R$ ${fgts}</td></tr>
  <tr><th>INSS</th><td>R$ ${inss}</td></tr>
  <tr><th>Férias (proporc.)</th><td>R$ ${ferias}</td></tr>
  <tr><th>13° (proporc.)</th><td>R$ ${decimoTerceiro}</td></tr>
  <tr><th>Total encargos</th><td>R$ ${totalEncargos}</td></tr>
</table>
<div class="footer">
  <p>Curitiba/PR, ${new Date(generatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
  <div>
    <span class="signature">${companyLegalName}<br/><small>EMPREGADOR</small></span>
    <span class="signature">${workerName}<br/><small>EMPREGADO(A)</small></span>
  </div>
</div>
<div class="meta">Turno · Contrato ID: ${contractId} · ${new Date(generatedAt).toISOString()}</div>
</body>
</html>`
}

export async function buildContractData(applicationId: string): Promise<ContractData | null> {
  const { data: app } = await supa
    .from("Application")
    .select("id, shiftId, workerId, Shift(role, date, startTime, endTime, hours, totalPay, Company(legalName, cnpj, address, neighborhood)), Worker(cpf, address, User(name))")
    .eq("id", applicationId)
    .single()

  if (!app) return null

  const shift   = (app as any).Shift
  const company = shift?.Company
  const worker  = (app as any).Worker

  return {
    companyLegalName: company?.legalName ?? "",
    companyCNPJ:      company?.cnpj ?? "",
    companyAddress:   `${company?.address ?? ""}, ${company?.neighborhood ?? ""}`,
    workerName:       worker?.User?.name ?? "Trabalhador",
    workerCPF:        worker?.cpf ?? "",
    workerAddress:    worker?.address ?? undefined,
    role:             shift?.role ?? "",
    shiftDate:        new Date(shift?.date).toLocaleDateString("pt-BR"),
    startTime:        shift?.startTime ?? "",
    endTime:          shift?.endTime ?? "",
    hours:            shift?.hours ?? 0,
    totalPay:         shift?.totalPay ?? 0,
    generatedAt:      new Date(),
    contractId:       `TURNO-${applicationId.slice(0, 8).toUpperCase()}`,
  }
}
