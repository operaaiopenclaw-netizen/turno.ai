// src/app/api/notifications/stream/route.ts
// Server-Sent Events — substitui polling de 30s por stream em tempo real
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

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
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { closed = true }
      }

      // Envia contagem inicial imediatamente
      const count = await db.notification.count({
        where: { userId, read: false },
      })
      send({ type: "unread_count", count })

      // Polling leve a cada 8s (vs 30s antes) — em prod troca por Redis pub/sub
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return }
        try {
          const [unread, latest] = await Promise.all([
            db.notification.count({ where: { userId, read: false } }),
            db.notification.findFirst({
              where:   { userId },
              orderBy: { createdAt: "desc" },
              select:  { id: true, createdAt: true },
            }),
          ])
          send({ type: "unread_count", count: unread, latestId: latest?.id })
        } catch { clearInterval(interval); closed = true }
      }, 8000)

      // Keepalive a cada 25s para manter conexão viva através de proxies
      const keepalive = setInterval(() => {
        if (closed) { clearInterval(keepalive); return }
        try { controller.enqueue(encoder.encode(": keepalive\n\n")) } catch { closed = true }
      }, 25000)
    },
    cancel() { closed = true },
  })

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
