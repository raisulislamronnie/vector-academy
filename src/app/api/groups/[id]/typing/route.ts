import { z } from "zod";
import { getTyping, setTyping } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const BodySchema = z.object({ userId: z.string().max(64), name: z.string().max(60) });

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return Response.json(await getTyping(id));
}

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  await setTyping(id, parsed.data.userId, parsed.data.name, true);
  return Response.json({ ok: true });
}
