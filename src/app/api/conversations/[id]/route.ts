import { deleteConversation, getConversation } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const userId = new URL(request.url).searchParams.get("userId");
  const conv = await getConversation(id);
  if (!conv || conv.ownerId !== userId) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ id: conv.id, title: conv.title, messages: conv.messages });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const userId = new URL(request.url).searchParams.get("userId");
  if (userId) await deleteConversation(id, userId);
  return Response.json({ ok: true });
}
