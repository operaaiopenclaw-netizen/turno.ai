"use client"
// src/components/ui/index.tsx
// All small shared UI components

import { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, useEffect } from "react"
import { getInitials } from "@/lib/utils"

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
  onClick,
  highlight,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  highlight?: "primary" | "orange" | "red" | "purple"
}) {
  const borders = {
    primary: "border-[--primary]/30 bg-[--primary-dim]",
    orange:  "border-[--orange]/30 bg-[--orange-dim]",
    red:     "border-[--red]/30 bg-[--red-dim]",
    purple:  "border-[--purple]/30 bg-[--purple-dim]",
  }
  return (
    <div
      onClick={onClick}
      className={`
        card ${onClick ? "card-clickable" : ""}
        ${highlight ? borders[highlight] : ""}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
type BadgeColor = "primary" | "orange" | "red" | "purple" | "gray"

const BADGE_STYLES: Record<BadgeColor, string> = {
  primary: "bg-[--primary-dim] text-[--primary] border-[--primary]/25",
  orange:  "bg-[--orange-dim] text-[--orange] border-[--orange]/25",
  red:     "bg-[--red-dim] text-[--red] border-[--red]/25",
  purple:  "bg-[--purple-dim] text-[--purple] border-[--purple]/25",
  gray:    "bg-white/5 text-[--txt-2] border-white/10",
}

export function Badge({ children, color = "primary", className = "" }: {
  children: ReactNode
  color?: BadgeColor
  className?: string
}) {
  return (
    <span className={`badge border ${BADGE_STYLES[color]} ${className}`}>
      {children}
    </span>
  )
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#00CFA4", "#FF9F43", "#7C83FD", "#FF6B6B", "#4ECDC4", "#A29BFE"]

export function Avatar({ name, size = 40, image }: {
  name: string
  size?: number
  image?: string | null
}) {
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  const initials = getInitials(name)
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `${color}1A`,
        border: `1.5px solid ${color}44`,
        color,
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  )
}

// ─── STARS ────────────────────────────────────────────────────────────────────
export function Stars({ value, showValue = true }: { value: number; showValue?: boolean }) {
  const n = Math.round(value)
  return (
    <span className="stars text-sm">
      {"★".repeat(n)}{"☆".repeat(5 - n)}
      {showValue && <span className="text-[--txt-2] text-xs ml-1">{value.toFixed(1)}</span>}
    </span>
  )
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, className = "", ...props }: InputProps) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input
        className={`${error ? "!border-[--red]" : ""} ${className}`}
        {...props}
      />
      {hint && !error  && <span className="form-hint">{hint}</span>}
      {error           && <span className="form-error">{error}</span>}
    </div>
  )
}

// ─── TEXTAREA ─────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <textarea className={`resize-y min-h-[90px] ${error ? "!border-[--red]" : ""} ${className}`} {...props} />
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error           && <span className="form-error">{error}</span>}
    </div>
  )
}

// ─── SELECT ───────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, hint, error, options, className = "", ...props }: SelectProps) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <select className={`cursor-pointer ${className}`} {...props}>
        <option value="">Selecionar...</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error           && <span className="form-error">{error}</span>}
    </div>
  )
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────
export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`label ${className}`}>{children}</div>
}

// ─── DIVIDER ──────────────────────────────────────────────────────────────────
export function Divider({ className = "" }: { className?: string }) {
  return <div className={`divider ${className}`} />
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" }
  return (
    <div className={`${s[size]} border-2 border-[--border-2] border-t-[--primary] rounded-full animate-spin`} />
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-[--txt] font-semibold text-base mb-2">{title}</div>
      {desc && <div className="text-[--txt-2] text-sm">{desc}</div>}
    </div>
  )
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return <div className="toast" onClick={onClose}>{message}</div>
}

// ─── INFO ROW ─────────────────────────────────────────────────────────────────
export function InfoRow({ label, value, valueColor }: {
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-[--border] last:border-0">
      <span className="text-[--txt-2] text-sm">{label}</span>
      <span className={`text-sm font-medium ${valueColor ?? "text-[--txt]"}`}>{value}</span>
    </div>
  )
}

// ─── METRIC CARD ─────────────────────────────────────────────────────────────
export function MetricCard({ value, label, color = "text-[--primary]" }: {
  value: string | number
  label: string
  color?: string
}) {
  return (
    <div className="metric-card">
      <div className={`metric-value ${color}`}>{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}
