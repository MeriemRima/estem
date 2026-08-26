import { requireOrgAccess } from "@/lib/auth";
import { subscribeOrderEvents } from "@/lib/order-events";

type Params = { params: Promise<{ orgId: string }> };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Params) {
  const { orgId } = await params;
  try {
    await requireOrgAccess(orgId);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          /* closed */
        }
      };
      send(JSON.stringify({ type: "connected" }));
      unsubscribe = subscribeOrderEvents((id) => {
        if (id === orgId) send(JSON.stringify({ type: "orders_changed" }));
      });
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);
      const prev = unsubscribe;
      unsubscribe = () => {
        clearInterval(heartbeat);
        prev();
      };
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
