"use client"
// src/components/ui/Button.tsx

import { ReactNode, ButtonHTMLAttributes } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "orange"
  size?: "sm" | "md" | "lg"
  full?: boolean
  loading?: boolean
  children: ReactNode
}

const VARIANTS = {
  primary:   "bg-[--primary] text-[#001a12] border-transparent",
  secondary: "bg-transparent text-[--txt] border-[--border-2]",
  ghost:     "bg-transparent text-[--primary] border-[--primary]/40",
  danger:    "bg-[--red] text-white border-transparent",
  orange:    "bg-[--orange] text-[#1a0800] border-transparent",
}

const SIZES = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-5 py-2.5 text-[13px]",
  lg: "px-6 py-3.5 text-[15px]",
}

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  loading = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-[9px] border
        transition-all duration-150 active:scale-[0.97]
        disabled:opacity-45 disabled:cursor-not-allowed
        ${VARIANTS[variant]}
        ${SIZES[size]}
        ${full ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
      )}
      {children}
    </button>
  )
}
