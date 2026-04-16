// src/types/index.ts

export type UserRole = "WORKER" | "COMPANY" | "ADMIN"
export type Industry = "HOSPITALITY" | "EVENTS" | "RETAIL" | "LOGISTICS" | "MANUFACTURING" | "OTHER"
export type ShiftStatus = "DRAFT" | "OPEN" | "FILLED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CONFIRMED" | "NO_SHOW"
export type TimesheetStatus = "PENDING" | "APPROVED" | "DISPUTED" | "RESOLVED"
export type PaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED"
export type PixKeyType = "CPF" | "EMAIL" | "PHONE" | "RANDOM"
export type BackgroundStatus = "PENDING" | "CLEAR" | "FLAGGED"

export interface Worker {
  id: string
  userId: string
  cpf: string
  phone: string
  bio?: string
  pixKey?: string
  pixKeyType?: PixKeyType
  neighborhood?: string
  city: string
  state: string
  rating: number
  totalShifts: number
  totalEarnings: number
  cpfVerified: boolean
  backgroundCheck: BackgroundStatus
  skills: WorkerSkill[]
  user: { name: string; email: string; image?: string }
}

export interface WorkerSkill {
  id: string
  workerId: string
  skill: string
}

export interface Company {
  id: string
  userId: string
  cnpj: string
  tradeName: string
  legalName: string
  phone: string
  address: string
  neighborhood: string
  city: string
  state: string
  pixKey?: string
  pixKeyType?: PixKeyType
  industry: Industry
  rating: number
  totalShifts: number
  verified: boolean
  user: { name: string; email: string }
}

export interface Shift {
  id: string
  companyId: string
  role: string
  description: string
  requirements?: string
  dresscode?: string
  date: string
  startTime: string
  endTime: string
  hours: number
  payPerHour: number
  totalPay: number
  spots: number
  filledSpots: number
  category: Industry
  neighborhood: string
  address?: string
  city: string
  status: ShiftStatus
  urgent: boolean
  createdAt: string
  company: Company
  _count?: { applications: number }
  userApplication?: Application | null
}

export interface Application {
  id: string
  shiftId: string
  workerId: string
  status: ApplicationStatus
  message?: string
  appliedAt: string
  worker?: Worker
  shift?: Shift
  timesheet?: Timesheet
  payment?: Payment
}

export interface Timesheet {
  id: string
  applicationId: string
  shiftId: string
  workerId: string
  checkInAt?: string
  checkOutAt?: string
  hoursWorked?: number
  status: TimesheetStatus
  approvedAt?: string
  worker?: Worker
  shift?: Shift
}

export interface Payment {
  id: string
  shiftId: string
  applicationId: string
  amount: number
  platformFee: number
  netAmount: number
  pixKey?: string
  pixE2eId?: string
  blockchainTxHash?: string
  blockchainBlock?: number
  status: PaymentStatus
  paidAt?: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  read: boolean
  createdAt: string
}

export interface DashboardStats {
  openShifts: number
  totalApplicants: number
  pendingTimesheets: number
  amountDue: number
}

export interface WorkerStats {
  totalEarnings: number
  totalShifts: number
  rating: number
  pendingApplications: number
}

// API response types
export type ApiResponse<T> = {
  data: T
  error?: never
} | {
  data?: never
  error: string
}

// Form types
export interface PostShiftForm {
  role: string
  description: string
  requirements: string
  dresscode: string
  date: string
  startTime: string
  endTime: string
  totalPay: number
  spots: number
  category: Industry
  neighborhood: string
  address: string
  urgent: boolean
}

export interface RegisterWorkerForm {
  name: string
  email: string
  password: string
  cpf: string
  phone: string
  pixKey: string
  pixKeyType: PixKeyType
  neighborhood: string
  bio: string
  skills: string[]
}

export interface RegisterCompanyForm {
  name: string
  email: string
  password: string
  cnpj: string
  tradeName: string
  legalName: string
  phone: string
  address: string
  neighborhood: string
  industry: Industry
  pixKey: string
  pixKeyType: PixKeyType
}

export const INDUSTRY_LABELS: Record<Industry, string> = {
  HOSPITALITY: "Hospitality",
  EVENTS: "Eventos",
  RETAIL: "Varejo",
  LOGISTICS: "Logística",
  MANUFACTURING: "Indústria",
  OTHER: "Outro",
}

export const INDUSTRY_EMOJI: Record<Industry, string> = {
  HOSPITALITY: "🍺",
  EVENTS: "🎪",
  RETAIL: "🏪",
  LOGISTICS: "📦",
  MANUFACTURING: "🏭",
  OTHER: "💼",
}

export const PLATFORM_FEE = 0.18 // 18%
