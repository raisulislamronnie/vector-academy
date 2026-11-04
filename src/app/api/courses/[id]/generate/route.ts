import { z } from "zod";
import { friendlyError } from "@/lib/errors";
import { ndjsonResponse } from "@/lib/ndjson";
import { createMaterial } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

type Ctx = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  kind: z.enum(["slides", "quiz", "assignments"]),
  options: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { kind, options } = parsed.data;

  return ndjsonResponse(request, async (send, signal) => {
    try {
      const course = await createMaterial(
        id,
        kind,
        options,
        (p) => send({ type: "progress", chars: p.chars, label: p.label }),
        signal,
      );
      send({ type: "done", course });
    } catch (err) {
      if (signal.aborted) return;
      console.error("[generate]", err);
      send({ type: "error", message: err instanceof z.ZodError ? z.prettifyError(err) : friendlyError(err) });
    }
  });
}
