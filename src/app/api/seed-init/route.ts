import { NextResponse } from "next/server"
import { PrismaClient, Industry, PixKeyType, BackgroundStatus } from "@prisma/client"
import bcrypt from "bcryptjs"
import { Decimal } from "@prisma/client/runtime/library"

export const maxDuration = 60

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get("secret") !== "turno-seed-2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const prisma = new PrismaClient()
  try {
    const hash = await bcrypt.hash("senha123", 12)

    const adminUser = await prisma.user.upsert({
      where: { email: "admin@turno.ai" },
      update: {},
      create: { name: "Admin Turno", email: "admin@turno.ai", passwordHash: hash, role: "ADMIN" },
    })

    const bodebrown = await prisma.user.upsert({
      where: { email: "rh@bodebrown.com.br" },
      update: {},
      create: {
        name: "Cervejaria Bodebrown", email: "rh@bodebrown.com.br", passwordHash: hash, role: "COMPANY",
        company: { create: {
          cnpj: "12.345.678/0001-90", tradeName: "Cervejaria Bodebrown",
          legalName: "Bodebrown Industria e Comercio de Bebidas LTDA",
          phone: "(41) 99333-1111", address: "Rua Carlos de Carvalho, 807",
          neighborhood: "Batel", city: "Curitiba", state: "PR",
          latitude: -25.4465, longitude: -49.2919,
          pixKey: "12345678000190", pixKeyType: PixKeyType.CNPJ,
          industry: Industry.HOSPITALITY, rating: 4.9, totalShifts: 47, verified: true,
        }},
      },
      include: { company: true },
    })

    const villa = await prisma.user.upsert({
      where: { email: "eventos@espacovilla.com.br" },
      update: {},
      create: {
        name: "Espaço Villa Curitiba", email: "eventos@espacovilla.com.br", passwordHash: hash, role: "COMPANY",
        company: { create: {
          cnpj: "98.765.432/0001-10", tradeName: "Espaço Villa Curitiba",
          legalName: "Villa Eventos e Festividades LTDA",
          phone: "(41) 99333-2222", address: "Rua Brigadeiro Franco, 2300",
          neighborhood: "Centro", city: "Curitiba", state: "PR",
          latitude: -25.4322, longitude: -49.2710,
          pixKey: "eventos@espacovilla.com.br", pixKeyType: PixKeyType.EMAIL,
          industry: Industry.EVENTS, rating: 4.7, totalShifts: 23, verified: true,
        }},
      },
      include: { company: true },
    })

    await prisma.wallet.upsert({ where: { userId: bodebrown.id }, update: {}, create: { userId: bodebrown.id, balance: new Decimal(3500), totalIn: new Decimal(5000), totalOut: new Decimal(1500) } })
    await prisma.wallet.upsert({ where: { userId: villa.id }, update: {}, create: { userId: villa.id, balance: new Decimal(2200), totalIn: new Decimal(3000), totalOut: new Decimal(800) } })

    const workers = [
      { name: "Ana Lima",         email: "ana.lima@gmail.com",         cpf: "529.982.247-25", phone: "(41) 99999-1111", neighborhood: "Água Verde",       pixKey: "ana.lima@gmail.com",         pixKeyType: PixKeyType.EMAIL, rating: 4.9, totalShifts: 47, totalEarnings: 4200, walletBal: 320,  skills: ["Garçom","Bartender","Inglês fluente","Eventos premium"] },
      { name: "Carlos Silva",     email: "carlos.silva@gmail.com",     cpf: "153.509.460-56", phone: "(41) 99999-2222", neighborhood: "Portão",           pixKey: "15350946056",               pixKeyType: PixKeyType.CPF,   rating: 4.7, totalShifts: 23, totalEarnings: 1850, walletBal: 0,    skills: ["Recepção","Eventos","Organização"] },
      { name: "Julia Mendes",     email: "julia.mendes@gmail.com",     cpf: "275.487.132-00", phone: "(41) 99999-3333", neighborhood: "Bigorrilho",       pixKey: "+5541999993333",             pixKeyType: PixKeyType.PHONE, rating: 4.8, totalShifts: 31, totalEarnings: 2700, walletBal: 164, skills: ["Garçom","Bartender júnior","Eventos"] },
      { name: "Rafael Costa",     email: "rafael.costa@gmail.com",     cpf: "017.065.320-91", phone: "(41) 99999-4444", neighborhood: "Rebouças",         pixKey: "rafael.costa@gmail.com",    pixKeyType: PixKeyType.EMAIL, rating: 4.6, totalShifts: 18, totalEarnings: 1620, walletBal: 0,    skills: ["Bartender","Drinks autorais","Flair"] },
      { name: "Mariana Ferreira", email: "mari.ferreira@gmail.com",    cpf: "049.160.273-00", phone: "(41) 99999-5555", neighborhood: "Santa Felicidade", pixKey: "04916027300",               pixKeyType: PixKeyType.CPF,   rating: 4.5, totalShifts: 8,  totalEarnings: 720,  walletBal: 82,  skills: ["Recepção","Hospitalidade"] },
    ]

    const createdWorkers: any[] = []
    for (const w of workers) {
      const u = await prisma.user.upsert({
        where: { email: w.email }, update: {},
        create: {
          name: w.name, email: w.email, passwordHash: hash, role: "WORKER",
          worker: { create: {
            cpf: w.cpf, phone: w.phone, neighborhood: w.neighborhood,
            pixKey: w.pixKey, pixKeyType: w.pixKeyType,
            rating: w.rating, totalShifts: w.totalShifts, totalEarnings: w.totalEarnings,
            cpfVerified: true, backgroundCheck: BackgroundStatus.CLEAR,
            skills: { create: w.skills.map(s => ({ skill: s })) },
          }},
        },
        include: { worker: true },
      })
      if (w.walletBal > 0) {
        await prisma.wallet.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id, balance: new Decimal(w.walletBal), totalIn: new Decimal(w.walletBal) } })
      }
      createdWorkers.push({ userId: u.id, workerId: u.worker!.id, pixKey: w.pixKey, pixKeyType: w.pixKeyType })
    }

    const [ana, carlos, julia, rafael, mariana] = createdWorkers
    const bbComp = bodebrown.company!
    const vvComp = villa.company!

    const D = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d }

    const s0 = await prisma.shift.create({ data: { companyId: bbComp.id, role: "Garçom", description: "Lançamento nova linha artesanal. 120 convidados.", requirements: "1 ano exp.", dresscode: "Social escuro", date: D(7), startTime: "18:00", endTime: "23:00", hours: 5, payPerHour: 30, totalPay: 150, spots: 3, filledSpots: 0, category: Industry.HOSPITALITY, neighborhood: "Batel", address: "Rua Carlos de Carvalho, 807", latitude: -25.4465, longitude: -49.2919, urgent: false, status: "OPEN" } })
    const s1 = await prisma.shift.create({ data: { companyId: vvComp.id, role: "Recepcionista", description: "Casamento com 200 convidados.", requirements: "Boa apresentação", dresscode: "Preto formal", date: D(3), startTime: "14:00", endTime: "21:00", hours: 7, payPerHour: 25, totalPay: 175, spots: 2, filledSpots: 0, category: Industry.EVENTS, neighborhood: "Centro", address: "Rua Brigadeiro Franco, 2300", latitude: -25.4322, longitude: -49.2710, urgent: true, status: "OPEN" } })
    const s2 = await prisma.shift.create({ data: { companyId: bbComp.id, role: "Bartender", description: "Sexta com banda ao vivo.", requirements: "2 anos exp.", dresscode: "Preto casual", date: D(1), startTime: "20:00", endTime: "02:00", hours: 6, payPerHour: 33.33, totalPay: 200, spots: 1, filledSpots: 1, category: Industry.HOSPITALITY, neighborhood: "Batel", address: "Rua Carlos de Carvalho, 807", latitude: -25.4465, longitude: -49.2919, urgent: false, status: "IN_PROGRESS" } })
    const s3 = await prisma.shift.create({ data: { companyId: vvComp.id, role: "Auxiliar Eventos", description: "Feira de tecnologia 2.000 visitantes.", requirements: "Disponibilidade", dresscode: "Camiseta + jeans", date: D(-5), startTime: "08:00", endTime: "17:00", hours: 9, payPerHour: 25, totalPay: 225, spots: 4, filledSpots: 4, category: Industry.EVENTS, neighborhood: "Centro", address: "Rua Comendador Araújo, 143", latitude: -25.4297, longitude: -49.2724, urgent: false, status: "COMPLETED" } })
    const s4 = await prisma.shift.create({ data: { companyId: bbComp.id, role: "Garçom", description: "Happy hour corporativo.", requirements: "Exp. corporativa", dresscode: "Social claro", date: D(-1), startTime: "17:00", endTime: "22:00", hours: 5, payPerHour: 28, totalPay: 140, spots: 2, filledSpots: 2, category: Industry.HOSPITALITY, neighborhood: "Água Verde", address: "Av. do Batel, 1140", latitude: -25.4510, longitude: -49.2946, urgent: false, status: "IN_PROGRESS" } })

    const appS0Ana    = await prisma.application.create({ data: { shiftId: s0.id, workerId: ana.workerId,    status: "PENDING",  appliedAt: D(-1) } })
    const appS0Carlos = await prisma.application.create({ data: { shiftId: s0.id, workerId: carlos.workerId, status: "PENDING",  appliedAt: D(-1) } })
    const appS1Julia  = await prisma.application.create({ data: { shiftId: s1.id, workerId: julia.workerId,  status: "ACCEPTED", appliedAt: D(-2), decidedAt: D(-1) } })
    const appS1Mar    = await prisma.application.create({ data: { shiftId: s1.id, workerId: mariana.workerId,status: "PENDING",  appliedAt: D(-1) } })
    const appS2Raf    = await prisma.application.create({ data: { shiftId: s2.id, workerId: rafael.workerId, status: "ACCEPTED", appliedAt: D(-3), decidedAt: D(-2) } })

    const appS3s = await Promise.all([ana, carlos, julia, mariana].map(w =>
      prisma.application.create({ data: { shiftId: s3.id, workerId: w.workerId, status: "ACCEPTED", appliedAt: D(-10), decidedAt: D(-9) } })
    ))
    const appS4Ana    = await prisma.application.create({ data: { shiftId: s4.id, workerId: ana.workerId,    status: "ACCEPTED", appliedAt: D(-3), decidedAt: D(-2) } })
    const appS4Carlos = await prisma.application.create({ data: { shiftId: s4.id, workerId: carlos.workerId, status: "ACCEPTED", appliedAt: D(-3), decidedAt: D(-2) } })

    await prisma.timesheet.create({ data: { applicationId: appS1Julia.id, shiftId: s1.id, workerId: julia.workerId, status: "PENDING" } })
    await prisma.timesheet.create({ data: { applicationId: appS2Raf.id, shiftId: s2.id, workerId: rafael.workerId, checkInAt: new Date(), checkInLat: -25.4465, checkInLng: -49.2919, status: "PENDING" } })

    for (let i = 0; i < appS3s.length; i++) {
      const w = [ana, carlos, julia, mariana][i]
      const checkIn = new Date(D(-5).getTime() + 8 * 3600000)
      const checkOut = new Date(D(-5).getTime() + 17 * 3600000)
      await prisma.timesheet.create({ data: { applicationId: appS3s[i].id, shiftId: s3.id, workerId: w.workerId, checkInAt: checkIn, checkInLat: -25.4297, checkInLng: -49.2724, checkOutAt: checkOut, checkOutLat: -25.4297, checkOutLng: -49.2724, hoursWorked: 9, status: "APPROVED", approvedAt: D(-4) } })
      await prisma.payment.create({ data: { shiftId: s3.id, applicationId: appS3s[i].id, amount: 225, platformFee: 40.5, netAmount: 184.5, pixKey: w.pixKey, pixKeyType: w.pixKeyType, status: "PAID", paidAt: D(-4) } })
    }

    const checkInS4 = new Date(D(-1).getTime() + 17 * 3600000)
    const checkOutS4 = new Date(D(-1).getTime() + 22 * 3600000)
    await prisma.timesheet.create({ data: { applicationId: appS4Ana.id, shiftId: s4.id, workerId: ana.workerId, checkInAt: checkInS4, checkInLat: -25.4510, checkInLng: -49.2946, checkOutAt: checkOutS4, checkOutLat: -25.4510, checkOutLng: -49.2946, hoursWorked: 5, status: "PENDING" } })
    await prisma.timesheet.create({ data: { applicationId: appS4Carlos.id, shiftId: s4.id, workerId: carlos.workerId, checkInAt: checkInS4, checkInLat: -25.4510, checkInLng: -49.2946, checkOutAt: checkOutS4, checkOutLat: -25.4510, checkOutLng: -49.2946, hoursWorked: 5, status: "PENDING" } })

    await prisma.notification.createMany({ data: [
      { userId: ana.userId,       type: "PAYMENT_SENT",         title: "Pagamento recebido ⚡",   body: "R$ 184,50 creditados na sua carteira",      read: true  },
      { userId: ana.userId,       type: "APPLICATION_ACCEPTED", title: "Candidatura aceita! 🎉", body: "Garçom — Happy Hour Bodebrown",              read: false },
      { userId: rafael.userId,    type: "APPLICATION_ACCEPTED", title: "Candidatura aceita! 🎉", body: "Bartender — Bodebrown sexta",                read: false },
      { userId: julia.userId,     type: "APPLICATION_ACCEPTED", title: "Candidatura aceita! 🎉", body: "Recepcionista — Casamento Espaço Villa",     read: false },
      { userId: bodebrown.id,     type: "NEW_APPLICANT",        title: "Novo candidato",          body: "Ana Lima — turno de Garçom",                read: false },
      { userId: bodebrown.id,     type: "TIMESHEET_APPROVED",   title: "Timesheets pendentes",    body: "2 timesheets aguardando aprovação",          read: false },
    ]})

    return NextResponse.json({
      ok: true,
      message: "Seed concluído!",
      logins: {
        admin:   "admin@turno.ai / senha123",
        empresa: "rh@bodebrown.com.br / senha123",
        worker:  "ana.lima@gmail.com / senha123",
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
