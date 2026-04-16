# ⚡ Turno — MVP Completo

Plataforma de trabalho temporário por turno para Curitiba.  
Conecta trabalhadores qualificados (garçons, bartenders, recepcionistas) a empresas de eventos e hospitality.

---

## Rodando em 4 passos

### Pré-requisitos
- **Node.js 18+** — `node --version`
- **PostgreSQL** local OU conta [Supabase](https://supabase.com) (gratuita)

```bash
# 1. Instalar dependências
cd turno
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env: mínimo necessário = DATABASE_URL + AUTH_SECRET
# Pix e Blockchain funcionam em mock automático — não precisam de config em dev

# 3. Criar banco e popular dados de Curitiba
npm run db:push
npm run db:seed

# 4. Rodar
npm run dev
# → http://localhost:3000
```

---

## Contas de demonstração

| Tipo | Email | Senha |
|------|-------|-------|
| 🍺 Empresa — Cervejaria Bodebrown | rh@bodebrown.com.br | senha123 |
| 🏛 Empresa — Espaço Villa Curitiba | eventos@espacovilla.com.br | senha123 |
| 🧑‍🍳 Trabalhadora — Ana Lima (4.9⭐) | ana.lima@gmail.com | senha123 |
| 🍸 Trabalhador — Rafael Costa | rafael.costa@gmail.com | senha123 |

---

## Fluxo completo de teste

### Como empresa (Bodebrown)
1. Login → **Dashboard** → métricas e turnos ativos
2. **Publicar turno** → preencher os 3 passos → publicar
3. **Candidatos** → ver perfis → clicar **Contratar** em um candidato
4. **Timesheet** → expandir → clicar **Aprovar e pagar**
5. **Pagamento** → confirmar Pix (mock em dev) → ver hash blockchain gerado
6. **Analytics** → ver talent pool e financeiro consolidado

### Como trabalhador (Ana Lima)
1. Login → browse de turnos → filtrar por Hospitality/Eventos
2. Clicar num turno → ver detalhes → **Candidatar-me**
3. **Meus Turnos** → acompanhar status (Aguardando → Contratado → Pago)
4. **Alertas** → ver notificações com badge de não lidas
5. **Perfil** → ver ganhos, avaliação, documentação, Pix

---

## Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 14 App Router (SSR + API Routes) |
| Banco de dados | PostgreSQL via Prisma ORM |
| Auth | NextAuth v5 (JWT, credentials) |
| Validação | Zod + validação manual CPF/CNPJ |
| Pagamentos | Pix via Celcoin API (mock em dev) |
| Blockchain | Polygon via ethers.js (mock em dev) |
| Contrato | Gerador HTML de CLT Intermitente |
| WhatsApp | Z-API (mock em dev — loga no console) |
| CSS | Tailwind CSS + CSS Variables custom |
| Estado | React Query / useState (sem Redux) |

---

## Estrutura completa

```
turno/
├── prisma/
│   ├── schema.prisma          10 models: User, Worker, Company, Shift,
│   │                          Application, Timesheet, Payment, Review,
│   │                          Notification, WorkerSkill
│   └── seed.ts                2 empresas + 5 trabalhadores + 4 turnos
│
├── scripts/
│   ├── TurnoPaymentRegistry.sol  Contrato Solidity (Polygon)
│   └── deploy-contract.ts        Script de deploy
│
├── src/
│   ├── types/index.ts         Todos os tipos TypeScript + constantes
│   ├── auth.ts                Export NextAuth para middleware
│   ├── middleware.ts           Proteção de rotas /worker e /empresa
│   │
│   ├── lib/
│   │   ├── db.ts              Prisma singleton
│   │   ├── auth.ts            NextAuth v5 com JWT + helpers
│   │   ├── pix.ts             Celcoin API (Pix real + mock dev)
│   │   ├── blockchain.ts      Polygon smart contract (real + mock dev)
│   │   ├── whatsapp.ts        Z-API WhatsApp (real + mock dev)
│   │   ├── contract.ts        Gerador HTML de CLT Intermitente
│   │   └── utils.ts           formatCurrency, validarCPF/CNPJ, etc.
│   │
│   ├── components/
│   │   ├── Providers.tsx      SessionProvider wrapper
│   │   ├── ui/                Button, Card, Badge, Avatar, Stars,
│   │   │                      Input, Textarea, Select, Toast, Spinner...
│   │   ├── worker/
│   │   │   ├── BottomNav.tsx  Nav com badge de notificações não lidas
│   │   │   └── ShiftCard.tsx  Card de turno com status de candidatura
│   │   └── business/
│   │       └── Sidebar.tsx    Nav lateral com Analytics
│   │
│   └── app/
│       ├── page.tsx           Landing (seleção de papel)
│       ├── login/             Login unificado
│       │
│       ├── api/
│       │   ├── auth/[...nextauth]/   NextAuth handler
│       │   ├── shifts/               CRUD turnos (GET, POST, PATCH)
│       │   ├── applications/         Candidaturas (GET, POST, PATCH)
│       │   ├── timesheet/            Check-in/out/approve/dispute
│       │   ├── payments/             Pix + blockchain
│       │   ├── reviews/              Avaliações bidirecionais
│       │   ├── workers/              Perfil trabalhador (GET, POST, PATCH)
│       │   ├── companies/            Perfil empresa + stats
│       │   ├── talent-pools/         Pool de trabalhadores da empresa
│       │   ├── contracts/            Contrato CLT Intermitente HTML
│       │   └── notifications/        Notificações (GET, PATCH)
│       │
│       ├── worker/
│       │   ├── page.tsx             Browse de turnos com filtros
│       │   ├── turno/[id]/          Detalhe + candidatura
│       │   ├── meus-turnos/         Candidaturas + status Pix
│       │   ├── checkin/[tsId]/      Check-in/out com GPS
│       │   ├── notificacoes/        Central de notificações
│       │   ├── avaliar/[shiftId]/   Avaliação pós-turno
│       │   ├── perfil/              Perfil, stats, Pix, skills
│       │   └── cadastro/            Registro 3 passos
│       │
│       ├── empresa/
│       │   ├── page.tsx             Dashboard com KPIs
│       │   ├── publicar/            Publicar turno 3 passos
│       │   ├── candidatos/          Gerenciar candidatos
│       │   ├── timesheet/           Aprovar/contestar jornadas
│       │   ├── pagamento/           Pix + comprovante blockchain
│       │   ├── analytics/           Talent pool + financeiro
│       │   └── cadastro/            Registro empresa 3 passos
│       │
│       └── admin/
│           └── page.tsx             Painel admin (role=ADMIN)
```

---

## Produção — Ativar integrações reais

### Pix (Celcoin)
```env
CELCOIN_CLIENT_ID="seu-client-id"
CELCOIN_CLIENT_SECRET="seu-secret"
CELCOIN_ACCOUNT="numero-conta"
CELCOIN_CNPJ="cnpj-turno"
CELCOIN_PIX_KEY="chave-pix-turno"
```
Documentação: https://developers.celcoin.com.br

### Blockchain (Polygon)
1. Compile e faça deploy de `scripts/TurnoPaymentRegistry.sol`
2. Configure:
```env
BLOCKCHAIN_PRIVATE_KEY="sua-private-key"
CONTRACT_ADDRESS="0x..."
BLOCKCHAIN_NETWORK="mainnet"  # ou "mumbai" para testes
```

### WhatsApp (Z-API)
```env
ZAPI_INSTANCE_ID="seu-id"
ZAPI_TOKEN="seu-token"
```
Documentação: https://developer.z-api.io

---

## Modelo de negócio

- **Taxa:** 18% por turno cobrado da empresa
- **Pagamento ao trabalhador:** 82% via Pix D+0
- **Registro:** cada transação imutável na Polygon

**Exemplo:** turno R$150 → trabalhador recebe R$123 · Turno recebe R$27

---

**MVP Beta · Curitiba · Hospitality & Eventos**  
Feito para validar com Cervejaria Bodebrown e Espaço Villa Curitiba 🚀
