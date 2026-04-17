// prisma/seed.ts
import {
  PrismaClient,
  Industry,
  PixKeyType,
  BackgroundStatus,
  ApplicationStatus,
  TimesheetStatus,
  PaymentStatus,
} from "@prisma/client"
import bcrypt from "bcryptjs"
import { Decimal } from "@prisma/client/runtime/library"

const prisma = new PrismaClient()

const PLATFORM_FEE = 0.18

function calcNet(amount: number) { return amount * (1 - PLATFORM_FEE) }
function calcFee(amount: number) { return amount * PLATFORM_FEE }

// Datas absolutas para seed determinístico
const D = (offsetDays: number) => {
  const d = new Date("2026-04-20T00:00:00Z")
  d.setDate(d.getDate() + offsetDays)
  return d
}

async function main() {
  console.log("🌱 Seeding database...")

  const hash = await bcrypt.hash("senha123", 12)

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where:  { email: "admin@turno.ai" },
    update: {},
    create: {
      name:         "Admin Turno",
      email:        "admin@turno.ai",
      passwordHash: hash,
      role:         "ADMIN",
    },
  })

  // ── COMPANIES ────────────────────────────────────────────────────────────
  const bodebrown = await prisma.user.upsert({
    where:  { email: "rh@bodebrown.com.br" },
    update: {},
    create: {
      name:         "Cervejaria Bodebrown",
      email:        "rh@bodebrown.com.br",
      passwordHash: hash,
      role:         "COMPANY",
      company: {
        create: {
          cnpj:         "12.345.678/0001-90",
          tradeName:    "Cervejaria Bodebrown",
          legalName:    "Bodebrown Industria e Comercio de Bebidas LTDA",
          phone:        "(41) 99333-1111",
          address:      "Rua Carlos de Carvalho, 807",
          neighborhood: "Batel",
          city:         "Curitiba",
          state:        "PR",
          latitude:     -25.4465,
          longitude:    -49.2919,
          pixKey:       "12345678000190",
          pixKeyType:   PixKeyType.CNPJ,
          industry:     Industry.HOSPITALITY,
          rating:       4.9,
          totalShifts:  47,
          verified:     true,
        },
      },
    },
    include: { company: true },
  })

  const espacoVilla = await prisma.user.upsert({
    where:  { email: "eventos@espacovilla.com.br" },
    update: {},
    create: {
      name:         "Espaço Villa Curitiba",
      email:        "eventos@espacovilla.com.br",
      passwordHash: hash,
      role:         "COMPANY",
      company: {
        create: {
          cnpj:         "98.765.432/0001-10",
          tradeName:    "Espaço Villa Curitiba",
          legalName:    "Villa Eventos e Festividades LTDA",
          phone:        "(41) 99333-2222",
          address:      "Rua Brigadeiro Franco, 2300",
          neighborhood: "Centro",
          city:         "Curitiba",
          state:        "PR",
          latitude:     -25.4322,
          longitude:    -49.2710,
          pixKey:       "eventos@espacovilla.com.br",
          pixKeyType:   PixKeyType.EMAIL,
          industry:     Industry.EVENTS,
          rating:       4.7,
          totalShifts:  23,
          verified:     true,
        },
      },
    },
    include: { company: true },
  })

  const bbComp = bodebrown.company!
  const vvComp = espacoVilla.company!

  // ── WALLETS DAS EMPRESAS ─────────────────────────────────────────────────
  await prisma.wallet.upsert({
    where:  { userId: bodebrown.id },
    update: {},
    create: {
      userId:  bodebrown.id,
      balance: new Decimal(3500),
      totalIn: new Decimal(5000),
      totalOut:new Decimal(1500),
      transactions: {
        create: [
          {
            type:        "DEPOSIT_PIX",
            amount:      new Decimal(5000),
            fee:         new Decimal(0),
            netAmount:   new Decimal(5000),
            status:      "CONFIRMED",
            reference:   "E00507202604100001",
            description: "Depósito inicial",
          },
          {
            type:        "ESCROW_RELEASE",
            amount:      new Decimal(1500),
            fee:         new Decimal(270),
            netAmount:   new Decimal(1500),
            status:      "CONFIRMED",
            description: "Pagamentos de turnos anteriores",
          },
        ],
      },
    },
  })

  await prisma.wallet.upsert({
    where:  { userId: espacoVilla.id },
    update: {},
    create: {
      userId:  espacoVilla.id,
      balance: new Decimal(2200),
      totalIn: new Decimal(3000),
      totalOut:new Decimal(800),
      transactions: {
        create: {
          type:        "DEPOSIT_PIX",
          amount:      new Decimal(3000),
          fee:         new Decimal(0),
          netAmount:   new Decimal(3000),
          status:      "CONFIRMED",
          reference:   "E00507202604120001",
          description: "Depósito inicial",
        },
      },
    },
  })

  // ── WORKERS ──────────────────────────────────────────────────────────────
  const workersData = [
    {
      name: "Ana Lima", email: "ana.lima@gmail.com",
      cpf: "529.982.247-25", phone: "(41) 99999-1111",
      bio: "5 anos em hospitalidade premium. Inglês fluente. Disponível fins de semana.",
      pixKey: "ana.lima@gmail.com", pixKeyType: PixKeyType.EMAIL,
      neighborhood: "Água Verde",
      rating: 4.9, totalShifts: 47, totalEarnings: 4200,
      walletBalance: 320,
      skills: ["Garçom", "Bartender", "Inglês fluente", "Eventos premium", "Sommelier básico"],
    },
    {
      name: "Carlos Silva", email: "carlos.silva@gmail.com",
      cpf: "153.509.460-56", phone: "(41) 99999-2222",
      bio: "Pontual e organizado. Experiência em casamentos e formaturas.",
      pixKey: "15350946056", pixKeyType: PixKeyType.CPF,
      neighborhood: "Portão",
      rating: 4.7, totalShifts: 23, totalEarnings: 1850,
      walletBalance: 0,
      skills: ["Recepção", "Eventos", "Organização", "Atendimento"],
    },
    {
      name: "Julia Mendes", email: "julia.mendes@gmail.com",
      cpf: "275.487.132-00", phone: "(41) 99999-3333",
      bio: "Atendimento de excelência. Referências disponíveis. Curitibana.",
      pixKey: "+5541999993333", pixKeyType: PixKeyType.PHONE,
      neighborhood: "Bigorrilho",
      rating: 4.8, totalShifts: 31, totalEarnings: 2700,
      walletBalance: 164,
      skills: ["Garçom", "Eventos", "Proatividade", "Bartender júnior"],
    },
    {
      name: "Rafael Costa", email: "rafael.costa@gmail.com",
      cpf: "017.065.320-91", phone: "(41) 99999-4444",
      bio: "Especialista em drinks autorais. 3 anos no mercado curitibano.",
      pixKey: "rafael.costa@gmail.com", pixKeyType: PixKeyType.EMAIL,
      neighborhood: "Rebouças",
      rating: 4.6, totalShifts: 18, totalEarnings: 1620,
      walletBalance: 0,
      skills: ["Bartender", "Drinks autorais", "Flair", "Carta de drinques"],
    },
    {
      name: "Mariana Ferreira", email: "mari.ferreira@gmail.com",
      cpf: "049.160.273-00", phone: "(41) 99999-5555",
      bio: "Recém formada em Hotelaria pela UTP. Energia e dedicação.",
      pixKey: "04916027300", pixKeyType: PixKeyType.CPF,
      neighborhood: "Santa Felicidade",
      rating: 4.5, totalShifts: 8, totalEarnings: 720,
      walletBalance: 82,
      skills: ["Recepção", "Hospitalidade", "Eventos", "Comunicação"],
    },
  ]

  const createdWorkers: Array<{
    id: string; workerId: string; userId: string;
    name: string; phone: string; pixKey: string; pixKeyType: PixKeyType
  }> = []

  for (const w of workersData) {
    const { skills, walletBalance, ...wd } = w
    const upserted = await prisma.user.upsert({
      where:  { email: wd.email },
      update: {},
      create: {
        name:         wd.name,
        email:        wd.email,
        passwordHash: hash,
        role:         "WORKER",
        worker: {
          create: {
            cpf:             wd.cpf,
            phone:           wd.phone,
            bio:             wd.bio,
            pixKey:          wd.pixKey,
            pixKeyType:      wd.pixKeyType,
            neighborhood:    wd.neighborhood,
            rating:          wd.rating,
            totalShifts:     wd.totalShifts,
            totalEarnings:   wd.totalEarnings,
            cpfVerified:     true,
            backgroundCheck: BackgroundStatus.CLEAR,
            skills: { create: skills.map(s => ({ skill: s })) },
          },
        },
      },
      include: { worker: true },
    })

    // Wallet do worker
    if (walletBalance > 0) {
      await prisma.wallet.upsert({
        where:  { userId: upserted.id },
        update: {},
        create: {
          userId:  upserted.id,
          balance: new Decimal(walletBalance),
          totalIn: new Decimal(walletBalance),
          transactions: {
            create: {
              type:        "ESCROW_RELEASE",
              amount:      new Decimal(walletBalance),
              fee:         new Decimal(0),
              netAmount:   new Decimal(walletBalance),
              status:      "CONFIRMED",
              description: "Saldo de turnos anteriores",
            },
          },
        },
      })
    }

    createdWorkers.push({
      id:         upserted.id,
      workerId:   upserted.worker!.id,
      userId:     upserted.id,
      name:       wd.name,
      phone:      wd.phone,
      pixKey:     wd.pixKey,
      pixKeyType: wd.pixKeyType,
    })
  }

  const [ana, carlos, julia, rafael, mariana] = createdWorkers

  // ── SHIFTS ────────────────────────────────────────────────────────────────
  const shifts = await Promise.all([
    // Shift 0 — futuro (candidaturas abertas)
    prisma.shift.create({
      data: {
        companyId:    bbComp.id,
        role:         "Garçom",
        description:  "Evento de lançamento nova linha artesanal. Serviço para 120 convidados. Dress code social.",
        requirements: "Experiência mínima de 1 ano em hospitalidade",
        dresscode:    "Social escuro",
        date:         D(7),
        startTime:    "18:00",
        endTime:      "23:00",
        hours:        5,
        payPerHour:   30,
        totalPay:     150,
        spots:        3,
        filledSpots:  0,
        category:     Industry.HOSPITALITY,
        neighborhood: "Batel",
        address:      "Rua Carlos de Carvalho, 807 — Batel, Curitiba",
        latitude:     -25.4465,
        longitude:    -49.2919,
        urgent:       false,
        status:       "OPEN",
      },
    }),
    // Shift 1 — urgente (candidaturas abertas)
    prisma.shift.create({
      data: {
        companyId:    vvComp.id,
        role:         "Recepcionista",
        description:  "Casamento com 200 convidados. Recepção, organização de mesas e apoio ao cerimonial.",
        requirements: "Boa apresentação, comunicativo, experiência em eventos sociais",
        dresscode:    "Preto formal",
        date:         D(3),
        startTime:    "14:00",
        endTime:      "21:00",
        hours:        7,
        payPerHour:   25,
        totalPay:     175,
        spots:        2,
        filledSpots:  0,
        category:     Industry.EVENTS,
        neighborhood: "Centro",
        address:      "Rua Brigadeiro Franco, 2300 — Centro, Curitiba",
        latitude:     -25.4322,
        longitude:    -49.2710,
        urgent:       true,
        status:       "OPEN",
      },
    }),
    // Shift 2 — completo, em progresso (para demonstrar checkin)
    prisma.shift.create({
      data: {
        companyId:    bbComp.id,
        role:         "Bartender",
        description:  "Sexta com banda ao vivo. Drinks clássicos e autorais.",
        requirements: "Mínimo 2 anos como bartender",
        dresscode:    "Preto casual",
        date:         D(1),
        startTime:    "20:00",
        endTime:      "02:00",
        hours:        6,
        payPerHour:   33.33,
        totalPay:     200,
        spots:        1,
        filledSpots:  1,
        category:     Industry.HOSPITALITY,
        neighborhood: "Batel",
        address:      "Rua Carlos de Carvalho, 807 — Batel, Curitiba",
        latitude:     -25.4465,
        longitude:    -49.2919,
        urgent:       false,
        status:       "IN_PROGRESS",
      },
    }),
    // Shift 3 — concluído e pago (histórico)
    prisma.shift.create({
      data: {
        companyId:    vvComp.id,
        role:         "Auxiliar de Eventos",
        description:  "Feira de tecnologia com 2.000 visitantes.",
        requirements: "Disponibilidade integral",
        dresscode:    "Camiseta fornecida + calça jeans escura",
        date:         D(-5),
        startTime:    "08:00",
        endTime:      "17:00",
        hours:        9,
        payPerHour:   25,
        totalPay:     225,
        spots:        4,
        filledSpots:  4,
        category:     Industry.EVENTS,
        neighborhood: "Centro",
        address:      "Rua Comendador Araújo, 143 — Centro, Curitiba",
        latitude:     -25.4297,
        longitude:    -49.2724,
        urgent:       false,
        status:       "COMPLETED",
      },
    }),
    // Shift 4 — timesheet pendente de aprovação
    prisma.shift.create({
      data: {
        companyId:    bbComp.id,
        role:         "Garçom",
        description:  "Happy hour corporativo. Serviço de mesa e buffet.",
        requirements: "Experiência com eventos corporativos",
        dresscode:    "Social claro",
        date:         D(-1),
        startTime:    "17:00",
        endTime:      "22:00",
        hours:        5,
        payPerHour:   28,
        totalPay:     140,
        spots:        2,
        filledSpots:  2,
        category:     Industry.HOSPITALITY,
        neighborhood: "Água Verde",
        address:      "Av. do Batel, 1140 — Água Verde, Curitiba",
        latitude:     -25.4510,
        longitude:    -49.2946,
        urgent:       false,
        status:       "IN_PROGRESS",
      },
    }),
  ])

  const [s0, s1, s2, s3, s4] = shifts

  // ── APPLICATIONS ──────────────────────────────────────────────────────────

  // s0 — turno futuro: pending applications
  await prisma.application.createMany({
    data: [
      { shiftId: s0.id, workerId: ana.workerId,    status: ApplicationStatus.PENDING,  appliedAt: D(-1), decidedAt: null, updatedAt: D(-1) },
      { shiftId: s0.id, workerId: carlos.workerId, status: ApplicationStatus.PENDING,  appliedAt: D(-1), decidedAt: null, updatedAt: D(-1) },
    ],
    skipDuplicates: true,
  })

  // s1 — urgente: 1 aceita, 1 pendente
  const appS1Ana = await prisma.application.upsert({
    where:  { shiftId_workerId: { shiftId: s1.id, workerId: julia.workerId } },
    update: {},
    create: { shiftId: s1.id, workerId: julia.workerId, status: ApplicationStatus.ACCEPTED, appliedAt: D(-2), decidedAt: D(-1), updatedAt: D(-1) },
  })
  await prisma.application.upsert({
    where:  { shiftId_workerId: { shiftId: s1.id, workerId: mariana.workerId } },
    update: {},
    create: { shiftId: s1.id, workerId: mariana.workerId, status: ApplicationStatus.PENDING, appliedAt: D(-1), decidedAt: null, updatedAt: D(-1) },
  })
  await prisma.timesheet.upsert({
    where:  { applicationId: appS1Ana.id },
    update: {},
    create: { applicationId: appS1Ana.id, shiftId: s1.id, workerId: julia.workerId, status: TimesheetStatus.PENDING },
  })

  // s2 — Rafael em progresso (checkin feito, aguardando checkout)
  const appS2Rafael = await prisma.application.upsert({
    where:  { shiftId_workerId: { shiftId: s2.id, workerId: rafael.workerId } },
    update: {},
    create: { shiftId: s2.id, workerId: rafael.workerId, status: ApplicationStatus.ACCEPTED, appliedAt: D(-3), decidedAt: D(-2), updatedAt: D(-2) },
  })
  await prisma.timesheet.upsert({
    where:  { applicationId: appS2Rafael.id },
    update: {},
    create: {
      applicationId: appS2Rafael.id,
      shiftId:       s2.id,
      workerId:      rafael.workerId,
      checkInAt:     new Date(D(1).getTime() + 20 * 60 * 60 * 1000),
      checkInLat:    -25.4465,
      checkInLng:    -49.2919,
      status:        TimesheetStatus.PENDING,
    },
  })

  // s3 — todos pagos (histórico completo)
  const appS3Workers = [ana, carlos, julia, mariana]
  for (const w of appS3Workers) {
    const app = await prisma.application.upsert({
      where:  { shiftId_workerId: { shiftId: s3.id, workerId: w.workerId } },
      update: {},
      create: { shiftId: s3.id, workerId: w.workerId, status: ApplicationStatus.ACCEPTED, appliedAt: D(-10), decidedAt: D(-9), updatedAt: D(-9) },
    })
    const checkIn  = new Date(D(-5).getTime() + 8  * 3600000)
    const checkOut = new Date(D(-5).getTime() + 17 * 3600000)
    const ts = await prisma.timesheet.upsert({
      where:  { applicationId: app.id },
      update: {},
      create: {
        applicationId: app.id,
        shiftId:       s3.id,
        workerId:      w.workerId,
        checkInAt:     checkIn,  checkInLat:  -25.4297, checkInLng:  -49.2724,
        checkOutAt:    checkOut, checkOutLat: -25.4297, checkOutLng: -49.2724,
        hoursWorked:   9,
        status:        TimesheetStatus.APPROVED,
        approvedAt:    D(-4),
      },
    })
    const amount = s3.totalPay
    const fee    = calcFee(amount)
    const net    = calcNet(amount)
    const e2eId  = `E00507${D(-4).getTime()}${w.workerId.slice(-6)}`
    const txHash = `0x${w.workerId.replace(/[^a-f0-9]/gi, "").slice(0, 16)}${Math.random().toString(16).slice(2).padEnd(48, "0")}`.slice(0, 66)
    await prisma.payment.upsert({
      where:  { applicationId: app.id },
      update: {},
      create: {
        shiftId:          s3.id,
        applicationId:    app.id,
        timesheetId:      ts.id,
        amount,
        platformFee:      fee,
        netAmount:        net,
        pixKey:           w.pixKey,
        pixKeyType:       w.pixKeyType,
        pixE2eId:         e2eId,
        blockchainTxHash: txHash,
        blockchainBlock:  BigInt(58350000 + Math.floor(Math.random() * 1000)),
        blockchainNetwork:"amoy",
        status:           PaymentStatus.PAID,
        paidAt:           D(-4),
      },
    })
  }

  // s4 — timesheet pendente de aprovação
  const appS4Ana = await prisma.application.upsert({
    where:  { shiftId_workerId: { shiftId: s4.id, workerId: ana.workerId } },
    update: {},
    create: { shiftId: s4.id, workerId: ana.workerId, status: ApplicationStatus.ACCEPTED, appliedAt: D(-3), decidedAt: D(-2), updatedAt: D(-2) },
  })
  const appS4Carlos = await prisma.application.upsert({
    where:  { shiftId_workerId: { shiftId: s4.id, workerId: carlos.workerId } },
    update: {},
    create: { shiftId: s4.id, workerId: carlos.workerId, status: ApplicationStatus.ACCEPTED, appliedAt: D(-3), decidedAt: D(-2), updatedAt: D(-2) },
  })
  const checkInS4  = new Date(D(-1).getTime() + 17 * 3600000)
  const checkOutS4 = new Date(D(-1).getTime() + 22 * 3600000)
  for (const [app, w] of [[appS4Ana, ana], [appS4Carlos, carlos]] as const) {
    await prisma.timesheet.upsert({
      where:  { applicationId: app.id },
      update: {},
      create: {
        applicationId: app.id,
        shiftId:       s4.id,
        workerId:      w.workerId,
        checkInAt:     checkInS4,  checkInLat:  -25.4510, checkInLng:  -49.2946,
        checkOutAt:    checkOutS4, checkOutLat: -25.4510, checkOutLng: -49.2946,
        hoursWorked:   5,
        status:        TimesheetStatus.PENDING,
      },
    })
  }

  // ── REVIEWS ──────────────────────────────────────────────────────────────
  const reviews = [
    { reviewerId: ana.userId,       workerId: ana.workerId,     companyId: null,    shiftId: s3.id, fromType: "WORKER" as const, rating: 5, comment: "Empresa excelente, muito organizada!" },
    { reviewerId: carlos.userId,    workerId: carlos.workerId,  companyId: null,    shiftId: s3.id, fromType: "WORKER" as const, rating: 5, comment: "Ótima empresa, pagamento rápido." },
    { reviewerId: julia.userId,     workerId: julia.workerId,   companyId: null,    shiftId: s3.id, fromType: "WORKER" as const, rating: 4, comment: "Boa organização, ambiente agradável." },
    { reviewerId: espacoVilla.id,   workerId: null,             companyId: vvComp.id, shiftId: s3.id, fromType: "COMPANY" as const, rating: 5, comment: "Ana é excelente! Pontual e proativa." },
    { reviewerId: espacoVilla.id,   workerId: null,             companyId: vvComp.id, shiftId: s3.id, fromType: "COMPANY" as const, rating: 4, comment: "Carlos muito dedicado. Voltar a contratar." },
  ]
  for (const r of reviews) {
    await prisma.review.upsert({
      where:  { reviewerId_shiftId: { reviewerId: r.reviewerId, shiftId: r.shiftId } },
      update: {},
      create: r,
    })
  }

  // ── NOTIFICATIONS ────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: ana.userId,    type: "PAYMENT_SENT",        title: "Pagamento recebido ⚡",   body: "R$ 184,50 creditados na sua carteira Turno",       read: true  },
      { userId: ana.userId,    type: "APPLICATION_ACCEPTED", title: "Candidatura aceita! 🎉",  body: "Você foi contratado para Garçom no Happy Hour",    read: false },
      { userId: rafael.userId, type: "APPLICATION_ACCEPTED", title: "Candidatura aceita! 🎉",  body: "Você foi contratado para Bartender na Bodebrown",  read: false },
      { userId: julia.userId,  type: "APPLICATION_ACCEPTED", title: "Candidatura aceita! 🎉",  body: "Você foi contratado para Recepcionista",           read: false },
      { userId: bodebrown.id,  type: "NEW_APPLICANT",        title: "Novo candidato",          body: "Ana Lima se candidatou ao turno de Garçom",        read: false },
      { userId: bodebrown.id,  type: "TIMESHEET_APPROVED",   title: "Timesheet para aprovar",  body: "2 timesheets aguardando aprovação — Happy Hour",   read: false },
      { userId: bodebrown.id,  type: "DEPOSIT_CONFIRMED",    title: "Depósito confirmado ✅",  body: "R$ 5.000,00 creditados na sua carteira Turno",     read: true  },
    ],
    skipDuplicates: true,
  })

  console.log("✅ Seed concluído!")
  console.log("")
  console.log("═══════════════════════════════════════════")
  console.log("  CREDENCIAIS DE ACESSO")
  console.log("═══════════════════════════════════════════")
  console.log("  Admin   → admin@turno.ai / senha123")
  console.log("  Empresa → rh@bodebrown.com.br / senha123")
  console.log("  Empresa → eventos@espacovilla.com.br / senha123")
  console.log("  Worker  → ana.lima@gmail.com / senha123")
  console.log("  Worker  → rafael.costa@gmail.com / senha123")
  console.log("  Worker  → julia.mendes@gmail.com / senha123")
  console.log("═══════════════════════════════════════════")
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
