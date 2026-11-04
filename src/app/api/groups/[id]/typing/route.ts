import { z } from "zod";
import { bus, groupChannel } from "@/lib/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const BodySchema = z.object({ userId: z.string().max(64), name: z.string().max(60) });

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  bus.emit(groupChannel(id), { type: "typing", userId: parsed.data.userId, name: parsed.data.name, on: true });
  return Response.json({ ok: true });
}
