// src/lib/utils.ts
import { Industry, PLATFORM_FEE } from "@/types"

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style:    "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day:     "2-digit",
    month:   "short",
  }).format(new Date(date))
}

export function formatTime(time: string): string {
  return time.slice(0, 5) // "18:00"
}

export function formatDateFull(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day:     "2-digit",
    month:   "long",
    year:    "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day:     "2-digit",
    month:   "short",
    hour:    "2-digit",
    minute:  "2-digit",
  }).format(new Date(date))
}

export function calcPlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_FEE * 100) / 100
}

export function calcNetAmount(amount: number): number {
  return Math.round((amount - calcPlatformFee(amount)) * 100) / 100
}

export function calcHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  let minutes = eh * 60 + em - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60 // overnight shift
  return Math.round((minutes / 60) * 10) / 10
}

export function maskCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, "")
  return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`
}

export function maskCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "")
  return `**.${clean.slice(2, 5)}.${clean.slice(5, 8)}/****-**`
}

export function formatCPF(cpf: string): string {
  const c = cpf.replace(/\D/g, "")
  return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9,11)}`
}

export function formatCNPJ(cnpj: string): string {
  const c = cnpj.replace(/\D/g, "")
  return `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12,14)}`
}

export function validateCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "")
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i)
  let rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  if (rem !== parseInt(c[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i)
  rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  return rem === parseInt(c[10])
}

export function validateCNPJ(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, "")
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  const calcDigit = (str: string, weights: number[]) => {
    const sum = str.split("").reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0)
    const rem = sum % 11
    return rem < 2 ? 0 : 11 - rem
  }
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2]
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2]
  if (calcDigit(c.slice(0,12), w1) !== parseInt(c[12])) return false
  if (calcDigit(c.slice(0,13), w2) !== parseInt(c[13])) return false
  return true
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

export const CATEGORY_COLORS: Record<Industry, string> = {
  HOSPITALITY:   "#00CFA4",
  EVENTS:        "#FF9F43",
  RETAIL:        "#7C83FD",
  LOGISTICS:     "#4ECDC4",
  MANUFACTURING: "#A29BFE",
  OTHER:         "#636e72",
}

export const CURITIBA_NEIGHBORHOODS = [
  "Água Verde", "Alto da Glória", "Alto da XV", "Bacacheri", "Bairro Alto",
  "Batel", "Bigorrilho", "Boa Vista", "Boqueirão", "Cajuru", "CIC",
  "Centro", "Centro Cívico", "Cristo Rei", "Ecoville", "Guabirotuba",
  "Hauer", "Hugo Lange", "Jardim Botânico", "Jardim Social", "Merces",
  "Novo Mundo", "Pinheirinho", "Portão", "Rebouças", "Santa Cândida",
  "Santa Felicidade", "São Francisco", "Seminário", "Tarumã", "Tingui",
  "Uberaba", "Umbará", "Xaxim",
].sort()
