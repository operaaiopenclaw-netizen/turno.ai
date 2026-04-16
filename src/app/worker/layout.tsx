// src/app/worker/layout.tsx
import { BottomNav } from "@/components/worker/BottomNav"

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="worker-app">
      <div style={{ paddingBottom: 72 }}>
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
