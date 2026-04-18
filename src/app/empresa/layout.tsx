// src/app/empresa/layout.tsx
import { auth } from "@/lib/auth"
import { supa } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/business/Sidebar"

export default async function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const session   = await auth()
  const companyId = (session?.user as any)?.companyId
  if (!companyId) redirect("/")

  const { data: company } = await supa.from("Company").select("tradeName").eq("id", companyId).single()

  return (
    <div className="biz-layout">
      <Sidebar companyName={company?.tradeName ?? "Empresa"} />
      <main className="biz-main">{children}</main>
    </div>
  )
}
