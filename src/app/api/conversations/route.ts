import { listConversations } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return Response.json([]);
  return Response.json(await listConversations(userId));
}
