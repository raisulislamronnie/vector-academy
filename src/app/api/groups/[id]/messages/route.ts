import { after } from "next/server";
import { z } from "zod";
import { addGroupMessage, getCourse, getGroup, listGroupMessages } from "@/lib/db";
import { replyInGroup } from "@/lib/group-ai";
import { UserSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!(await getGroup(id))) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(await listGroupMessages(id));
}

const BodySchema = z.object({
  user: UserSchema,
  text: z.string().trim().max(4000).default(""),
  courseId: z.string().optional(),
});

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const group = await getGroup(id);
  if (!group) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid message" }, { status: 400 });
  const { user, text, courseId } = parsed.data;

  let courseTitle: string | undefined;
  if (courseId) {
    const course = await getCourse(courseId);
    if (!course) return Response.json({ error: "Course not found" }, { status: 404 });
    courseTitle = course.title;
  } else if (!text) {
    return Response.json({ error: "Empty message" }, { status: 400 });
  }

  const msg = await addGroupMessage({
    groupId: id,
    authorId: user.id,
    authorName: user.name,
    authorColor: user.color,
    kind: courseId ? "share" : "text",
    text,
    courseId,
    courseTitle,
  });

  if (/@(ai|vector)\b/i.test(text)) after(() => replyInGroup(group));

  return Response.json(msg);
}
