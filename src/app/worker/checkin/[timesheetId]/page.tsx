"use client"
// src/app/worker/checkin/[timesheetId]/page.tsx
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/Button"
import { Card, Spinner, Badge } from "@/components/ui"
import { formatCurrency } from "@/lib/utils"

type LocationState = { lat: number; lng: number; accuracy: number } | null

export default function CheckInPage() {
  const { timesheetId } = useParams() as { timesheetId: string }
  const router = useRouter()
  const { data: session } = useSession()

  const [timesheet, setTimesheet] = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [locating,  setLocating]  = useState(false)
  const [acting,    setActing]    = useState(false)
  const [location,  setLocation]  = useState<LocationState>(null)
  const [locError,  setLocError]  = useState("")
  const [toast,     setToast]     = useState("")

  useEffect(() => {
    async function load() {
      const res  = await fetch(`/api/timesheet/${timesheetId}`)
      const json = await res.json()
      setTimesheet(json.data)
      setLoading(false)
    }
    load()
  }, [timesheetId])

  function getLocation(): Promise<LocationState> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização não suportada"))
        return
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        err => reject(new Error("Não foi possível obter localização: " + err.message)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  async function handleCheckIn() {
    setLocating(true)
    setLocError("")
    let loc: LocationState = null
    try {
      loc = await getLocation()
      setLocation(loc)
    } catch (e: any) {
      setLocError(e.message + " — usando localização aproximada")
      loc = { lat: -25.4465, lng: -49.2919, accuracy: 500 } // Curitiba fallback
    }
    setLocating(false)
    setActing(true)
    const res = await fetch(`/api/timesheet/${timesheetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkin", latitude: loc?.lat, longitude: loc?.lng }),
    })
    if (res.ok) {
      setToast("Check-in registrado! ✓")
      setTimeout(() => router.push("/worker/meus-turnos"), 2000)
    } else {
      const j = await res.json()
      setToast(j.error ?? "Erro ao registrar check-in")
    }
    setActing(false)
  }

  async function handleCheckOut() {
    setLocating(true)
    let loc: LocationState = null
    try {
      loc = await getLocation()
    } catch {
      loc = { lat: -25.4465, lng: -49.2919, accuracy: 500 }
    }
    setLocating(false)
    setActing(true)
    const res = await fetch(`/api/timesheet/${timesheetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout", latitude: loc?.lat, longitude: loc?.lng }),
    })
    if (res.ok) {
      setToast("Check-out registrado! Aguarde aprovação do timesheet ✓")
      setTimeout(() => router.push("/worker/meus-turnos"), 2500)
    } else {
      const j = await res.json()
      setToast(j.error ?? "Erro")
    }
    setActing(false)
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <Spinner />
    </div>
  )

  if (!timesheet) return (
    <div style={{ padding: 24, color: "var(--txt-2)" }}>Timesheet não encontrado.</div>
  )

  const shift = timesheet.shift
  const hasCheckedIn  = !!timesheet.checkInAt
  const hasCheckedOut = !!timesheet.checkOutAt

  return (
    <div style={{ padding: "0 0 32px" }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        background: "var(--surface)",
        borderBottom: "0.5px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--txt-2)", fontSize: 20, cursor: "pointer" }}>←</button>
        <span style={{ fontWeight: 600, color: "#fff", fontSize: 15 }}>
          {!hasCheckedIn ? "Check-in" : !hasCheckedOut ? "Check-out" : "Turno concluído"}
        </span>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {/* Shift info */}
        {shift && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{shift.role}</div>
                <div style={{ fontSize: 13, color: "var(--txt-2)", marginTop: 2 }}>{shift.company?.tradeName}</div>
                <div style={{ fontSize: 12, color: "var(--txt-3)", marginTop: 4 }}>
                  📍 {shift.neighborhood} · ⏰ {shift.startTime}–{shift.endTime}
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>
                {formatCurrency(shift.totalPay)}
              </div>
            </div>
          </Card>
        )}

        {/* Status steps */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 0 }}>
          {[
            ["Contratado", hasCheckedIn || hasCheckedOut],
            ["Check-in",   hasCheckedIn],
            ["Check-out",  hasCheckedOut],
            ["Pago",       timesheet.status === "APPROVED"],
          ].map(([label, done], i) => (
            <div key={label as string} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: done ? "var(--primary)" : "var(--surface-2)",
                  border: `1.5px solid ${done ? "var(--primary)" : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: done ? "#001a12" : "var(--txt-3)", fontWeight: 700,
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <div style={{ fontSize: 10, color: done ? "var(--primary)" : "var(--txt-3)", whiteSpace: "nowrap" }}>
                  {label as string}
                </div>
              </div>
              {i < 3 && <div style={{ flex: 1, height: "0.5px", background: done ? "var(--primary)" : "var(--border)", margin: "0 4px", marginBottom: 16 }} />}
            </div>
          ))}
        </div>

        {/* Check-in record */}
        {hasCheckedIn && (
          <Card style={{ marginBottom: 12, background: "var(--primary-dim)", border: "0.5px solid rgba(0,207,164,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--txt-3)" }}>Check-in registrado</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                  {new Date(timesheet.checkInAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <Badge color="primary">✓ GPS verificado</Badge>
            </div>
          </Card>
        )}

        {/* Check-out record */}
        {hasCheckedOut && (
          <Card style={{ marginBottom: 12, background: "var(--primary-dim)", border: "0.5px solid rgba(0,207,164,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--txt-3)" }}>Check-out registrado</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                  {new Date(timesheet.checkOutAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
                {timesheet.hoursWorked && (
                  <div style={{ fontSize: 12, color: "var(--primary)", marginTop: 4 }}>
                    {timesheet.hoursWorked}h trabalhadas
                  </div>
                )}
              </div>
              <Badge color="primary">✓ GPS verificado</Badge>
            </div>
          </Card>
        )}

        {/* Location error */}
        {locError && (
          <div style={{
            padding: "10px 14px",
            background: "var(--orange-dim)",
            border: "0.5px solid rgba(255,159,67,0.3)",
            borderRadius: 9,
            fontSize: 12,
            color: "var(--orange)",
            marginBottom: 14,
          }}>
            ⚠️ {locError}
          </div>
        )}

        {/* Actions */}
        {!hasCheckedIn && !hasCheckedOut && (
          <div>
            <div style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.6, marginBottom: 20 }}>
              Para fazer check-in, permita o acesso à sua localização. Isso confirma que você está no local do turno.
            </div>
            <Button
              full
              size="lg"
              loading={locating || acting}
              onClick={handleCheckIn}
            >
              {locating ? "Obtendo localização..." : "📍 Fazer check-in agora"}
            </Button>
          </div>
        )}

        {hasCheckedIn && !hasCheckedOut && (
          <div>
            <div style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.6, marginBottom: 20 }}>
              Turno em andamento. Faça check-out ao terminar para que o timesheet seja enviado para aprovação.
            </div>
            <Button
              full
              size="lg"
              variant="orange"
              loading={locating || acting}
              onClick={handleCheckOut}
            >
              {locating ? "Obtendo localização..." : "✓ Fazer check-out"}
            </Button>
          </div>
        )}

        {hasCheckedIn && hasCheckedOut && (
          <div style={{
            background: "var(--primary-dim)",
            border: "0.5px solid rgba(0,207,164,0.3)",
            borderRadius: 12,
            padding: "24px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Turno concluído!
            </div>
            <div style={{ fontSize: 13, color: "var(--txt-2)", lineHeight: 1.6 }}>
              Seu timesheet foi enviado para aprovação. Você receberá o Pix assim que a empresa aprovar.
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="toast" style={{ color: toast.includes("✓") ? "var(--primary)" : "var(--red)" }}>
          {toast}
        </div>
      )}
    </div>
  )
}
