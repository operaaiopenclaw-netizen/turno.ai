// prisma/seed.ts
import { PrismaClient, Industry, PixKeyType, BackgroundStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database with Curitiba data...")

  // ─── COMPANIES ──────────────────────────────────────────────────────────────
  const companyHash = await bcrypt.hash("senha123", 12)

  const bodebrown = await prisma.user.upsert({
    where: { email: "rh@bodebrown.com.br" },
    update: {},
    create: {
      name: "Cervejaria Bodebrown",
      email: "rh@bodebrown.com.br",
      passwordHash: companyHash,
      role: "COMPANY",
      company: {
        create: {
          cnpj: "12.345.678/0001-90",
          tradeName: "Cervejaria Bodebrown",
          legalName: "Bodebrown Industria e Comercio de Bebidas LTDA",
          phone: "(41) 3333-1111",
          address: "Rua Carlos de Carvalho, 807",
          neighborhood: "Batel",
          city: "Curitiba",
          state: "PR",
          latitude: -25.4465,
          longitude: -49.2919,
          pixKey: "12.345.678/0001-90",
          pixKeyType: PixKeyType.CPF,
          industry: Industry.HOSPITALITY,
          rating: 4.9,
          totalShifts: 47,
          verified: true,
        },
      },
    },
    include: { company: true },
  })

  const espacoVilla = await prisma.user.upsert({
    where: { email: "eventos@espacovilla.com.br" },
    update: {},
    create: {
      name: "Espaço Villa Curitiba",
      email: "eventos@espacovilla.com.br",
      passwordHash: companyHash,
      role: "COMPANY",
      company: {
        create: {
          cnpj: "98.765.432/0001-10",
          tradeName: "Espaço Villa Curitiba",
          legalName: "Villa Eventos e Festividades LTDA",
          phone: "(41) 3333-2222",
          address: "Rua Brigadeiro Franco, 2300",
          neighborhood: "Centro",
          city: "Curitiba",
          state: "PR",
          latitude: -25.4322,
          longitude: -49.2710,
          industry: Industry.EVENTS,
          rating: 4.7,
          totalShifts: 23,
          verified: true,
        },
      },
    },
    include: { company: true },
  })

  // ─── WORKERS ──────────────────────────────────────────────────────────────
  const workerHash = await bcrypt.hash("senha123", 12)

  const workerUsers = [
    {
      name: "Ana Lima",
      email: "ana.lima@gmail.com",
      cpf: "123.456.789-01",
      phone: "(41) 99999-1111",
      bio: "5 anos em hospitalidade premium. Inglês fluente. Disponível fins de semana.",
      pixKey: "ana.lima@gmail.com",
      pixKeyType: PixKeyType.EMAIL,
      neighborhood: "Água Verde",
      rating: 4.9,
      totalShifts: 47,
      totalEarnings: 4200,
      skills: ["Garçom", "Bartender", "Inglês fluente", "Eventos premium", "Sommelier básico"],
    },
    {
      name: "Carlos Silva",
      email: "carlos.silva@gmail.com",
      cpf: "234.567.890-02",
      phone: "(41) 99999-2222",
      bio: "Pontual e organizado. Experiência em casamentos e formaturas. CLT ativo.",
      pixKey: "23456789002",
      pixKeyType: PixKeyType.CPF,
      neighborhood: "Portão",
      rating: 4.7,
      totalShifts: 23,
      totalEarnings: 1850,
      skills: ["Recepção", "Eventos", "Organização", "Atendimento"],
    },
    {
      name: "Julia Mendes",
      email: "julia.mendes@gmail.com",
      cpf: "345.678.901-03",
      phone: "(41) 99999-3333",
      bio: "Atendimento de excelência. Referências disponíveis. Curitibana.",
      pixKey: "(41) 99999-3333",
      pixKeyType: PixKeyType.PHONE,
      neighborhood: "Bigorrilho",
      rating: 4.8,
      totalShifts: 31,
      totalEarnings: 2700,
      skills: ["Garçom", "Eventos", "Proatividade", "Bartender júnior"],
    },
    {
      name: "Rafael Costa",
      email: "rafael.costa@gmail.com",
      cpf: "456.789.012-04",
      phone: "(41) 99999-4444",
      bio: "Especialista em drinks autorais. 3 anos no mercado curitibano.",
      pixKey: "rafael.costa@gmail.com",
      pixKeyType: PixKeyType.EMAIL,
      neighborhood: "Rebouças",
      rating: 4.6,
      totalShifts: 18,
      totalEarnings: 1620,
      skills: ["Bartender", "Drinks autorais", "Flair", "Carta de drinques"],
    },
    {
      name: "Mariana Ferreira",
      email: "mari.ferreira@gmail.com",
      cpf: "567.890.123-05",
      phone: "(41) 99999-5555",
      bio: "Recém formada em Hotelaria pela UTP. Energia e dedicação.",
      pixKey: "56789012305",
      pixKeyType: PixKeyType.CPF,
      neighborhood: "Santa Felicidade",
      rating: 4.5,
      totalShifts: 8,
      totalEarnings: 720,
      skills: ["Recepção", "Hospitalidade", "Eventos", "Comunicação"],
    },
  ]

  const createdWorkers = []
  for (const w of workerUsers) {
    const { skills, ...workerData } = w
    const user = await prisma.user.upsert({
      where: { email: workerData.email },
      update: {},
      create: {
        name: workerData.name,
        email: workerData.email,
        passwordHash: workerHash,
        role: "WORKER",
        worker: {
          create: {
            cpf: workerData.cpf,
            phone: workerData.phone,
            bio: workerData.bio,
            pixKey: workerData.pixKey,
            pixKeyType: workerData.pixKeyType,
            neighborhood: workerData.neighborhood,
            rating: workerData.rating,
            totalShifts: workerData.totalShifts,
            totalEarnings: workerData.totalEarnings,
            cpfVerified: true,
            backgroundCheck: BackgroundStatus.CLEAR,
            skills: {
              create: skills.map(s => ({ skill: s })),
            },
          },
        },
      },
      include: { worker: true },
    })
    createdWorkers.push(user)
  }

  // ─── SHIFTS ───────────────────────────────────────────────────────────────
  const bodebrown_company = bodebrown.company!
  const espacovilla_company = espacoVilla.company!

  const now = new Date()
  const addDays = (d: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + d)
    return date
  }

  const shifts = [
    {
      companyId: bodebrown_company.id,
      role: "Garçom",
      description: "Evento de lançamento de nova linha artesanal. Serviço para 120 convidados. Dress code social obrigatório.",
      requirements: "Experiência mínima de 1 ano em hospitalidade",
      dresscode: "Social escuro",
      date: addDays(4),
      startTime: "18:00",
      endTime: "23:00",
      hours: 5,
      payPerHour: 30,
      totalPay: 150,
      spots: 3,
      category: Industry.HOSPITALITY,
      neighborhood: "Batel",
      address: "Rua Carlos de Carvalho, 807 — Batel, Curitiba",
      latitude: -25.4465,
      longitude: -49.2919,
      urgent: false,
    },
    {
      companyId: espacovilla_company.id,
      role: "Recepcionista",
      description: "Casamento com 200 convidados. Recepção e organização de mesas, apoio ao cerimonial e coordenação de entrada.",
      requirements: "Boa apresentação, comunicativo, experiência em eventos sociais",
      dresscode: "Preto formal",
      date: addDays(5),
      startTime: "14:00",
      endTime: "21:00",
      hours: 7,
      payPerHour: 25,
      totalPay: 175,
      spots: 2,
      category: Industry.EVENTS,
      neighborhood: "Centro",
      address: "Rua Brigadeiro Franco, 2300 — Centro, Curitiba",
      latitude: -25.4322,
      longitude: -49.2710,
      urgent: true,
    },
    {
      companyId: bodebrown_company.id,
      role: "Bartender",
      description: "Sexta com banda ao vivo. Experiência com drinks clássicos e autorais essencial. Alta demanda.",
      requirements: "Mínimo 2 anos como bartender",
      dresscode: "Preto casual",
      date: addDays(10),
      startTime: "20:00",
      endTime: "02:00",
      hours: 6,
      payPerHour: 33.33,
      totalPay: 200,
      spots: 1,
      category: Industry.HOSPITALITY,
      neighborhood: "Batel",
      address: "Rua Carlos de Carvalho, 807 — Batel, Curitiba",
      latitude: -25.4465,
      longitude: -49.2919,
      urgent: false,
    },
    {
      companyId: espacovilla_company.id,
      role: "Auxiliar de Eventos",
      description: "Feira de tecnologia com 2.000 visitantes. Montagem, recepção, suporte geral e organização de credenciamento.",
      requirements: "Disponibilidade integral, organização",
      dresscode: "Camiseta fornecida + calça jeans escura",
      date: addDays(11),
      startTime: "08:00",
      endTime: "17:00",
      hours: 9,
      payPerHour: 25,
      totalPay: 225,
      spots: 8,
      category: Industry.EVENTS,
      neighborhood: "Centro",
      address: "Rua Comendador Araújo, 143 — Centro, Curitiba",
      latitude: -25.4297,
      longitude: -49.2724,
      urgent: false,
    },
  ]

  for (const shift of shifts) {
    await prisma.shift.create({ data: shift })
  }

  console.log("✓ Companies seeded: Bodebrown, Espaço Villa")
  console.log("✓ Workers seeded: 5 workers in Curitiba")
  console.log("✓ Shifts seeded: 4 shifts open")
  console.log("")
  console.log("═══ LOGIN CREDENTIALS ═══")
  console.log("Empresa → rh@bodebrown.com.br / senha123")
  console.log("Empresa → eventos@espacovilla.com.br / senha123")
  console.log("Trabalhador → ana.lima@gmail.com / senha123")
  console.log("Trabalhador → rafael.costa@gmail.com / senha123")
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
