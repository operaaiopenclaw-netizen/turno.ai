// src/app/api/notifications/stream/route.ts
import { auth } from "@/lib/auth"
import { supa } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const userId = session.user.id
  let closed = false
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch { closed = true }
      }

      const { count } = await supa.from("Notification").select("*", { count: "exact", head: true }).eq("userId", userId).eq("read", false)
      send({ type: "unread_count", count: count ?? 0 })

      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return }
        try {
          const [unreadRes, latestRes] = await Promise.all([
            supa.from("Notification").select("*", { count: "exact", head: true }).eq("userId", userId).eq("read", false),
            supa.from("Notification").select("id, createdAt").eq("userId", userId).order("createdAt", { ascending: false }).limit(1),
          ])
          send({ type: "unread_count", count: unreadRes.count ?? 0, latestId: latestRes.data?.[0]?.id })
        } catch { clearInterval(interval); closed = true }
      }, 8000)

      const keepalive = setInterval(() => {
        if (closed) { clearInterval(keepalive); return }
        try { controller.enqueue(encoder.encode(": keepalive\n\n")) } catch { closed = true }
      }, 25000)
    },
    cancel() { closed = true },
  })

  return new Response(stream, {
    headers: {
      "Content-Type":     "text/event-stream",
      "Cache-Control":    "no-cache, no-transform",
      "Connection":       "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
