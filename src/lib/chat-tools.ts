import "server-only";
import { z } from "zod";
import { listCourses } from "./db";
import { createCourse, createMaterial, createStandalone } from "./services";
import type { ProgressFn } from "./generate";
import {
  AssignmentsRequestSchema,
  BriefSchema,
  CourseRequestSchema,
  QuizRequestSchema,
  SlidesRequestSchema,
} from "./schemas";

const withCourseId = <T extends z.ZodObject>(s: T) =>
  s.extend({ courseId: z.string().describe("ID of an existing course (from create_course or list_courses)") });

const TOOL_DEFS = {
  create_slides: {
    description:
      "Create a standalone slide deck on any topic, WITHOUT making a course. Use this whenever the tutor asks for slides/a presentation/a deck and does not refer to an existing course. Shown directly in chat with download buttons.",
    schema: BriefSchema.extend(SlidesRequestSchema.shape),
  },
  create_quiz: {
    description:
      "Create a standalone MCQ quiz on any topic, WITHOUT making a course. Use this whenever the tutor asks for a quiz/MCQs/test questions and does not refer to an existing course.",
    schema: BriefSchema.extend(QuizRequestSchema.shape),
  },
  create_assignments: {
    description:
      "Create standalone assignments with rubrics on any topic, WITHOUT making a course. Use this whenever the tutor asks for assignments/homework/projects and does not refer to an existing course.",
    schema: BriefSchema.extend(AssignmentsRequestSchema.shape),
  },
  create_course: {
    description:
      "Generate and save a complete course (modules, full lesson notes, objectives, glossary, resources). ONLY when the tutor explicitly asks for a course, unit, curriculum or syllabus. Takes 1-4 minutes. Returns the new courseId.",
    schema: CourseRequestSchema,
  },
  generate_slides: {
    description: "Generate a slide deck for an EXISTING saved course (needs courseId). Replaces that course's previous deck.",
    schema: withCourseId(SlidesRequestSchema),
  },
  generate_quiz: {
    description: "Generate an MCQ quiz for an EXISTING saved course (needs courseId).",
    schema: withCourseId(QuizRequestSchema),
  },
  generate_assignments: {
    description: "Generate assignments with rubrics for an EXISTING saved course (needs courseId).",
    schema: withCourseId(AssignmentsRequestSchema),
  },
  list_courses: {
    description: "List courses already saved in the tutor's library (id, title, level, which materials exist).",
    schema: z.object({}),
  },
} as const;

export type ToolName = keyof typeof TOOL_DEFS;

/** Same tools as Gemini function declarations. */
export const GEMINI_TOOLS = [
  {
    functionDeclarations: (Object.keys(TOOL_DEFS) as ToolName[]).map((name) => {
      const json = z.toJSONSchema(TOOL_DEFS[name].schema, { io: "input" }) as Record<string, unknown>;
      delete json.$schema;
      return { name, description: TOOL_DEFS[name].description, parametersJsonSchema: json };
    }),
  },
];


export { TOOL_LABELS } from "./chat-display";

export interface ToolOutcome {
  content: string;
  isError: boolean;
  meta?: { courseId?: string; title?: string; kind?: string };
}

export async function runTool(
  name: string,
  input: unknown,
  author: string,
  onProgress: ProgressFn,
  signal: AbortSignal,
): Promise<ToolOutcome> {
  if (!(name in TOOL_DEFS)) return { content: `Unknown tool: ${name}`, isError: true };
  const parsed = TOOL_DEFS[name as ToolName].schema.safeParse(input ?? {});
  if (!parsed.success) {
    return { content: `INVALID_INPUT: ${z.prettifyError(parsed.error)}`, isError: true };
  }
  const args = parsed.data as Record<string, unknown>;
  try {
    switch (name as ToolName) {
      case "list_courses": {
        const courses = await listCourses();
        return {
          content: JSON.stringify(
            courses.slice(0, 50).map((c) => ({
              courseId: c.id,
              title: c.title,
              level: c.level,
              modules: c.moduleCount,
              slides: c.hasSlides,
              quiz: c.hasQuiz,
              assignments: c.hasAssignments,
            })),
          ),
          isError: false,
        };
      }
      case "create_slides":
      case "create_quiz":
      case "create_assignments": {
        const kind = name === "create_slides" ? "slides" : name === "create_quiz" ? "quiz" : "assignments";
        const { topic, audience, language, notes, ...opts } = args as Record<string, unknown>;
        const brief = BriefSchema.parse({ topic, audience, language, notes });
        const r = await createStandalone(kind, brief, opts, author, onProgress, signal);
        const summary =
          r.kind === "slides"
            ? { slides: r.data.slides.length, slideTitles: r.data.slides.map((x) => x.title) }
            : r.kind === "quiz"
              ? { questions: r.data.questions.length }
              : { assignments: r.data.assignments.map((a) => a.title) };
        return {
          content: JSON.stringify({ ok: true, kind, resourceId: r.id, title: r.title, ...summary }),
          isError: false,
        };
      }
      case "create_course": {
        const course = await createCourse(CourseRequestSchema.parse(args), author, onProgress, signal);
        return {
          content: JSON.stringify({
            ok: true,
            kind: "course",
            courseId: course.id,
            courseTitle: course.title,
            modules: course.modules.map((m) => ({ title: m.title, lessons: m.lessons.map((l) => l.title) })),
            url: `/courses/${course.id}`,
          }),
          isError: false,
          meta: { courseId: course.id, title: course.title, kind: "course" },
        };
      }
      default: {
        const kind = name === "generate_slides" ? "slides" : name === "generate_quiz" ? "quiz" : "assignments";
        const { courseId, ...opts } = args as { courseId: string };
        const course = await createMaterial(courseId, kind, opts, onProgress, signal);
        const summary =
          kind === "slides"
            ? { slides: course.slides!.slides.length, deckTitle: course.slides!.deckTitle }
            : kind === "quiz"
              ? { questions: course.quiz!.questions.length, title: course.quiz!.title }
              : { assignments: course.assignments!.assignments.map((a) => a.title) };
        return {
          content: JSON.stringify({ ok: true, courseId, courseTitle: course.title, kind, ...summary, url: `/courses/${courseId}?tab=${kind}` }),
          isError: false,
          meta: { courseId, title: course.title, kind },
        };
      }
    }
  } catch (err) {
    if (signal.aborted) throw err;
    return { content: `ERROR: ${err instanceof Error ? err.message : String(err)}`, isError: true };
  }
}
