import { z } from "zod";
import { friendlyError } from "@/lib/errors";
import { listCourses } from "@/lib/db";
import { ndjsonResponse } from "@/lib/ndjson";
import { CourseRequestSchema } from "@/lib/schemas";
import { createCourse } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  return Response.json(await listCourses());
}

const BodySchema = z.object({ request: CourseRequestSchema, author: z.string().min(1).max(60) });

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  const { request: req, author } = parsed.data;

  return ndjsonResponse(request, async (send, signal) => {
    send({ type: "status", stage: "outline" });
    try {
      const course = await createCourse(
        req,
        author,
        (p) => send({ type: "progress", chars: p.chars, label: p.label }),
        signal,
      );
      send({ type: "done", courseId: course.id });
    } catch (err) {
      if (signal.aborted) return;
      console.error("[courses]", err);
      send({ type: "error", message: friendlyError(err) });
    }
  });
}
