import "server-only";

export type Send = (event: Record<string, unknown>) => void;

/** Returns a streaming NDJSON response; `run` pushes events with `send`. */
export function ndjsonResponse(
  request: Request,
  run: (send: Send, signal: AbortSignal) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send: Send = (event) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          closed = true;
        }
      };
      const ping = setInterval(() => send({ type: "ping" }), 15000);
      try {
        await run(send, request.signal);
      } finally {
        clearInterval(ping);
        closed = true;
        try {
          controller.close();
        } catch {}
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
