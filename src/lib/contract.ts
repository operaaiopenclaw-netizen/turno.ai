// src/lib/contract.ts
// Gera o contrato de trabalho intermitente conforme CLT art. 443 §3°
// O HTML gerado pode ser convertido em PDF com bibliotecas como puppeteer ou html-pdf-node

export interface ContractData {
  // Empresa
  companyLegalName: string
  companyCNPJ:      string
  companyAddress:   string
  // Trabalhador
  workerName:       string
  workerCPF:        string
  workerAddress?:   string
  // Turno
  role:             string
  shiftDate:        string
  startTime:        string
  endTime:          string
  hours:            number
  totalPay:         number
  // Geração
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

  const hourlyRate = (totalPay / hours).toFixed(2)
  const fgts       = (totalPay * 0.08).toFixed(2)
  const inss       = (totalPay * 0.075).toFixed(2)   // tabela simplificada
  const ferias     = (totalPay / 12).toFixed(2)
  const decimoTerceiro = (totalPay / 12).toFixed(2)
  const totalBruto = totalPay.toFixed(2)
  const totalEncargos = (parseFloat(fgts) + parseFloat(inss) + parseFloat(ferias) + parseFloat(decimoTerceiro)).toFixed(2)

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
  .clause strong { font-weight: bold; }
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
  <p>Art. 443, §3°, da Consolidação das Leis do Trabalho — CLT<br/>
  Contrato nº ${contractId}</p>
</div>

<div class="clause">
Pelo presente instrumento particular, de um lado, na qualidade de <strong>EMPREGADOR</strong>:
</div>

<table>
  <tr><th>Razão Social</th><td>${companyLegalName}</td></tr>
  <tr><th>CNPJ</th><td>${companyCNPJ}</td></tr>
  <tr><th>Endereço</th><td>${companyAddress}</td></tr>
</table>

<div class="clause">
E de outro lado, na qualidade de <strong>EMPREGADO(A)</strong>:
</div>

<table>
  <tr><th>Nome</th><td>${workerName}</td></tr>
  <tr><th>CPF</th><td>${workerCPF}</td></tr>
  ${workerAddress ? `<tr><th>Endereço</th><td>${workerAddress}</td></tr>` : ""}
</table>

<h2>CLÁUSULA 1ª — OBJETO</h2>
<div class="clause">
As partes celebram o presente <strong>Contrato de Trabalho Intermitente</strong>, nos termos dos artigos 443, §3°, 452-A e seguintes da CLT (incluídos pela Lei 13.467/2017 — Reforma Trabalhista), para prestação de serviços na função de <strong>${role}</strong>.
</div>

<h2>CLÁUSULA 2ª — PERÍODO DO TURNO</h2>
<table>
  <tr><th>Data</th><td>${shiftDate}</td></tr>
  <tr><th>Horário de início</th><td>${startTime}</td></tr>
  <tr><th>Horário de término</th><td>${endTime}</td></tr>
  <tr><th>Total de horas</th><td>${hours}h</td></tr>
</table>

<h2>CLÁUSULA 3ª — REMUNERAÇÃO E ENCARGOS</h2>
<div class="clause">
O Empregador pagará ao Empregado(a) a remuneração calculada conforme abaixo, incluídas as verbas proporcionais conforme art. 452-A, §6° da CLT:
</div>
<table>
  <tr><th>Valor por hora</th><td>R$ ${hourlyRate}</td></tr>
  <tr><th>Total bruto pelo turno</th><td>R$ ${totalBruto}</td></tr>
  <tr><th>FGTS (8%)</th><td>R$ ${fgts}</td></tr>
  <tr><th>INSS (contrib. segurado)</th><td>R$ ${inss}</td></tr>
  <tr><th>Férias + 1/3 (proporc.)</th><td>R$ ${ferias}</td></tr>
  <tr><th>13° Salário (proporc.)</th><td>R$ ${decimoTerceiro}</td></tr>
  <tr><th><strong>Total de encargos</strong></th><td><strong>R$ ${totalEncargos}</strong></td></tr>
</table>
<div class="clause">
O pagamento será realizado via <strong>transferência Pix</strong> em até 24 horas após a aprovação do timesheet pelo Empregador, conforme art. 452-A, §7°, CLT.
</div>

<h2>CLÁUSULA 4ª — NATUREZA INTERMITENTE</h2>
<div class="clause">
O presente contrato possui natureza <strong>intermitente</strong>, não gerando obrigação de convocação recorrente. A ausência de convocação não caracteriza inatividade contratual nem implica rescisão. Cada turno é formalizado por meio de aceite eletrônico na plataforma Turno.
</div>

<h2>CLÁUSULA 5ª — RECUSA E DESISTÊNCIA</h2>
<div class="clause">
A recusa da oferta não descaracteriza a relação de emprego nem gera qualquer penalidade ao Empregado(a), conforme §5° do art. 452-A da CLT. A desistência do turno com menos de 24 horas de antecedência obriga ao pagamento de 50% do valor do turno como multa, nos termos do §6° do art. 452-A.
</div>

<h2>CLÁUSULA 6ª — FORO</h2>
<div class="clause">
Fica eleito o foro da Comarca de <strong>Curitiba/PR</strong> para dirimir quaisquer questões oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
</div>

<div class="footer">
  <p>Curitiba/PR, ${new Date(generatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
  <div>
    <span class="signature">${companyLegalName}<br/><small>EMPREGADOR</small></span>
    <span class="signature">${workerName}<br/><small>EMPREGADO(A)</small></span>
  </div>
</div>

<div class="meta">
  Gerado pela plataforma Turno · Contrato ID: ${contractId} · ${new Date(generatedAt).toISOString()}
</div>
</body>
</html>`
}

// Endpoint to generate and return contract as HTML
// In prod: use puppeteer to convert to PDF and serve
export async function buildContractData(applicationId: string, db: any): Promise<ContractData | null> {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      shift: { include: { company: { include: { user: { select: { name: true } } } } } },
      worker: { include: { user: { select: { name: true } } } },
    },
  })

  if (!app) return null

  return {
    companyLegalName: app.shift.company.legalName,
    companyCNPJ:      app.shift.company.cnpj,
    companyAddress:   `${app.shift.company.address}, ${app.shift.company.neighborhood} — ${app.shift.company.city}/${app.shift.company.state}`,
    workerName:       app.worker.user.name ?? "Trabalhador",
    workerCPF:        app.worker.cpf,
    role:             app.shift.role,
    shiftDate:        new Date(app.shift.date).toLocaleDateString("pt-BR"),
    startTime:        app.shift.startTime,
    endTime:          app.shift.endTime,
    hours:            app.shift.hours,
    totalPay:         app.shift.totalPay,
    generatedAt:      new Date(),
    contractId:       `TURNO-${applicationId.slice(0, 8).toUpperCase()}`,
  }
}
