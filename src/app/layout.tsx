// src/app/layout.tsx
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Providers } from "@/components/Providers"

export const metadata: Metadata = {
  title: "Turno — Trabalho temporário em Curitiba",
  description: "Conectando trabalhadores qualificados a empresas de eventos e hospitality em Curitiba.",
  keywords: ["trabalho temporário", "Curitiba", "garçom", "bartender", "eventos", "hospitality"],
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Turno" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#07101F",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
