// src/app/empresa/layout.tsx
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/business/Sidebar"

export default async function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const session   = await auth()
  const companyId = (session?.user as any)?.companyId

  if (!companyId) redirect("/login")

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { tradeName: true },
  })

  return (
    <div className="biz-layout">
      <Sidebar companyName={company?.tradeName ?? "Empresa"} />
      <main className="biz-main">{children}</main>
    </div>
  )
}
