"use client"
// src/components/worker/ShiftCard.tsx

import Link from "next/link"
import { Shift } from "@/types"
import { Badge } from "@/components/ui"
import { formatCurrency, formatDate, CATEGORY_COLORS } from "@/lib/utils"
import { INDUSTRY_EMOJI, INDUSTRY_LABELS } from "@/types"

export function ShiftCard({ shift }: { shift: Shift }) {
  const applied = shift.userApplication !== null
  const color   = CATEGORY_COLORS[shift.category]

  return (
    <Link href={`/worker/turno/${shift.id}`} className="block">
      <div className="card card-clickable mb-3 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-3 items-center">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: `${color}15`, border: `0.5px solid ${color}30` }}
            >
              {INDUSTRY_EMOJI[shift.category]}
            </div>
            <div>
              <div className="font-bold text-[--txt] text-[15px] leading-tight">{shift.role}</div>
              <div className="text-[--txt-2] text-xs mt-0.5">{shift.company.tradeName}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-extrabold text-[--primary] text-lg leading-none">
              {formatCurrency(shift.totalPay)}
            </div>
            <div className="text-[--txt-3] text-[10px] mt-0.5">{shift.hours}h de trabalho</div>
          </div>
        </div>

        {/* Info pills */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          <Badge color="gray">📅 {formatDate(shift.date)}</Badge>
          <Badge color="gray">⏰ {shift.startTime}–{shift.endTime}</Badge>
          <Badge color="gray">📍 {shift.neighborhood}</Badge>
        </div>

        {/* Footer */}
        <div className="divider !my-2" />
        <div className="flex justify-between items-center">
          <span className="text-[--txt-3] text-[11px]">
            {shift._count?.applications ?? 0} candidatos · {shift.spots - shift.filledSpots} vaga{shift.spots - shift.filledSpots !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-1.5">
            {shift.urgent && <Badge color="red">⚡ Urgente</Badge>}
            {applied ? (
              <Badge color="primary">✓ Candidatado</Badge>
            ) : (
              <span className="text-[--primary] text-[11px]">Ver detalhes →</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
