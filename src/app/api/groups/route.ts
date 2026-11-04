import { z } from "zod";
import { createGroup, listGroups } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await listGroups());
}

const BodySchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).default(""),
  emoji: z.string().max(8).default("💬"),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid group" }, { status: 400 });
  return Response.json(await createGroup(parsed.data));
}
