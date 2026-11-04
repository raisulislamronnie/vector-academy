import { deleteCourse, getCourse } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const course = await getCourse((await params).id);
  if (!course) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(course);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  await deleteCourse((await params).id);
  return Response.json({ ok: true });
}
