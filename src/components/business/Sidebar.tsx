"use client"
// src/components/business/Sidebar.tsx

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface SidebarProps {
  companyName: string
}

const NAV = [
  { href: "/empresa",             icon: "📊", label: "Dashboard" },
  { href: "/empresa/publicar",    icon: "➕", label: "Publicar turno" },
  { href: "/empresa/candidatos",  icon: "👥", label: "Candidatos" },
  { href: "/empresa/timesheet",   icon: "⏱", label: "Timesheet" },
  { href: "/empresa/pagamento",   icon: "💰", label: "Pagamento" },
  { href: "/empresa/analytics",   icon: "📈", label: "Analytics" },
]

export function Sidebar({ companyName }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="biz-sidebar">
      {/* Logo */}
      <div className="pb-5 mb-4 border-b border-[--border]">
        <div className="text-2xl font-extrabold tracking-tight text-white leading-none">
          Turno<span className="text-[--primary]">.</span>
        </div>
        <div className="text-[11px] text-[--txt-3] mt-1.5 leading-tight">{companyName}</div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV.map(item => {
          const isActive = item.href === "/empresa"
            ? pathname === "/empresa"
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[9px] text-[13px] transition-all ${
                isActive
                  ? "bg-[--primary-dim] text-[--primary] font-semibold"
                  : "text-[--txt-2] hover:bg-white/5"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[--primary]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="mt-auto pt-4 border-t border-[--border]">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2 px-3.5 py-2 text-[12px] text-[--txt-3] hover:text-[--txt-2] rounded-[9px] hover:bg-white/5 transition-colors"
        >
          ← Sair
        </button>
      </div>
    </aside>
  )
}
