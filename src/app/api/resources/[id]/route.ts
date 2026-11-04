import { getResource } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const r = await getResource((await params).id);
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(r);
}
