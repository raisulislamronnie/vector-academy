import { bus, groupChannel } from "@/lib/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Server-Sent Events stream of new messages & typing indicators for a group. */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const channel = groupChannel(id);
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const onEvent = (event: unknown) => write(`data: ${JSON.stringify(event)}\n\n`);
      const ping = setInterval(() => write(`: ping\n\n`), 20000);
      bus.on(channel, onEvent);
      write(`retry: 3000\n\n`);
      cleanup = () => {
        clearInterval(ping);
        bus.off(channel, onEvent);
        try {
          controller.close();
        } catch {}
      };
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
