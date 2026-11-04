import "server-only";
import type { z } from "zod";
import { geminiStructured } from "./gemini";
import {
  AssignmentSetSchema,
  CourseContentSchema,
  QuizSchema,
  SlideDeckSchema,
  type AssignmentSet,
  type Brief,
  type Course,
  type CourseRequest,
  type Quiz,
  type SlideDeck,
} from "./schemas";

export interface Progress {
  chars: number;
  label: string;
}
export type ProgressFn = (p: Progress) => void;

const TUTOR_SYSTEM = `You are Vector Academy's senior instructional designer. You build teaching material for professional tutors.
Quality bar:
- Accurate, current, and pedagogically sound; scaffold from fundamentals to application.
- Concrete: worked examples, real-world contexts, common misconceptions called out.
- Ready to teach tomorrow: a tutor should be able to use the output without edits.
- Write every learner-facing string in the requested language.`;

/** Streams a structured-output request to Gemini, reporting progress, and returns the parsed object. */
async function streamStructured<S extends z.ZodType>(opts: {
  schema: S;
  prompt: string;
  onProgress?: ProgressFn;
  signal?: AbortSignal;
}): Promise<z.infer<S>> {
  // Progress: char count + latest title seen in the streamed JSON.
  let lastEmit = 0;
  let label = "";
  let finalLen = 0;
  const titleRe = /"(?:title|question|deckTitle)"\s*:\s*"((?:[^"\\]|\\.){3,140})"/g;
  const report = (text: string) => {
    finalLen = text.length;
    const now = Date.now();
    if (now - lastEmit < 350) return;
    lastEmit = now;
    titleRe.lastIndex = Math.max(0, text.length - 2000);
    let m: RegExpExecArray | null;
    while ((m = titleRe.exec(text))) label = m[1].replace(/\\"/g, '"');
    opts.onProgress?.({ chars: text.length, label });
  };

  const result = await geminiStructured({
    schema: opts.schema,
    system: TUTOR_SYSTEM,
    prompt: opts.prompt,
    onText: report,
    signal: opts.signal,
  });
  opts.onProgress?.({ chars: finalLen, label: "Finalizing" });
  return result;
}

const DEPTH_GUIDE: Record<CourseRequest["depth"], string> = {
  brief: "2 lessons per module, ~250 words of notes per lesson",
  standard: "3 lessons per module, ~450 words of notes per lesson",
  comprehensive: "3-4 lessons per module, ~700 words of notes per lesson with multiple worked examples",
};

export async function generateCourse(req: CourseRequest, onProgress?: ProgressFn, signal?: AbortSignal) {
  const prompt = `Design a complete course.

Subject: ${req.subject}
${req.focus ? `Focus / syllabus: ${req.focus}\n` : ""}Level: ${req.level}
Audience: ${req.audience || "general learners at this level"}
Modules: exactly ${req.moduleCount}
Depth: ${req.depth} (${DEPTH_GUIDE[req.depth]})
Language: ${req.language}
${req.notes ? `Tutor notes: ${req.notes}\n` : ""}
Include 5-8 measurable learning objectives, realistic prerequisites, 8-15 glossary terms, and 4-6 high-quality resources (books, sites, tools — real ones only).`;
  return streamStructured({
    schema: CourseContentSchema,
    prompt,
    onProgress,
    signal,
  });
}

/** Full course text given to the model as source material for slides, quizzes, assignments. */
function courseContext(c: Course): string {
  const parts = [
    `# ${c.title}`,
    c.subtitle,
    `Level: ${c.level} · Audience: ${c.audience} · Language: ${c.language}`,
    `## Objectives\n${c.objectives.map((o) => `- ${o}`).join("\n")}`,
  ];
  c.modules.forEach((m, mi) => {
    parts.push(`## Module ${mi + 1}: ${m.title}\n${m.overview}`);
    m.lessons.forEach((l, li) => {
      parts.push(
        `### Lesson ${mi + 1}.${li + 1}: ${l.title}\n${l.content}\nKey takeaways:\n${l.keyTakeaways.map((k) => `- ${k}`).join("\n")}`,
      );
    });
  });
  return parts.join("\n\n");
}

/** What the material is built from: a saved course, or a tutor's brief. */
export type Source = Course | Brief;

function isCourse(src: Source): src is Course {
  return "modules" in src;
}

function sourceBlock(src: Source): { block: string; language: string; level: string; scope: string } {
  if (isCourse(src)) {
    return { block: `<course>\n${courseContext(src)}\n</course>`, language: src.language, level: src.level, scope: "this course" };
  }
  const block = `<brief>\nTopic: ${src.topic}\nAudience: ${src.audience || "general learners"}\nLanguage: ${src.language}${
    src.notes ? `\nTutor notes: ${src.notes}` : ""
  }\n</brief>\nThere is no course for this. Base the material on accurate, standard knowledge of the topic at the audience's level.`;
  return { block, language: src.language, level: src.audience || "the stated audience", scope: `the topic "${src.topic}"` };
}

export async function generateSlides(
  source: Source,
  opts: { slideCount: number; focus: string },
  onProgress?: ProgressFn,
  signal?: AbortSignal,
): Promise<SlideDeck> {
  const src = sourceBlock(source);
  const prompt = `${src.block}

Create a presentation deck of exactly ${opts.slideCount} slides for ${src.scope}${opts.focus ? `, focused on: ${opts.focus}` : ""}.
- Slide 1 uses the "title" layout; the last slide uses "summary".
- Mix layouts: mostly "bullets", some "two-column" comparisons, 1-2 "quote" slides for key ideas.
- Bullets: 3-5 per slide, max ~14 words each. Punchy, not paragraphs.
- Speaker notes: 2-4 sentences the tutor can say aloud.
- Language: ${src.language}.`;
  return streamStructured({ schema: SlideDeckSchema, prompt, onProgress, signal });
}

export async function generateQuiz(
  source: Source,
  opts: { questionCount: number; difficulty: string; focus: string },
  onProgress?: ProgressFn,
  signal?: AbortSignal,
): Promise<Quiz> {
  const src = sourceBlock(source);
  const prompt = `${src.block}

Write a multiple-choice quiz of exactly ${opts.questionCount} questions on ${src.scope}${opts.focus ? `, focused on: ${opts.focus}` : ""}.
Difficulty: ${opts.difficulty}${opts.difficulty === "mixed" ? " (roughly 30% easy, 45% medium, 25% hard)" : ""}.
- Exactly 4 options each; one unambiguously correct; distractors plausible and based on real misconceptions.
- Vary the position of the correct answer.
- Test understanding and application, not just recall.
- Explanation says why the answer is right and why the tempting distractor is wrong.
- Language: ${src.language}.`;
  const quiz = await streamStructured({ schema: QuizSchema, prompt, onProgress, signal });
  quiz.questions = quiz.questions.map((q) => ({
    ...q,
    correctIndex: Math.min(Math.max(0, Math.round(q.correctIndex)), q.options.length - 1),
  }));
  return quiz;
}

export async function generateAssignments(
  source: Source,
  opts: { count: number; focus: string },
  onProgress?: ProgressFn,
  signal?: AbortSignal,
): Promise<AssignmentSet> {
  const src = sourceBlock(source);
  const prompt = `${src.block}

Create exactly ${opts.count} assignment(s) for ${src.scope}${opts.focus ? `, focused on: ${opts.focus}` : ""}.
- Vary the types (e.g. problem-set, project, essay, case-study) to suit the subject.
- Clear numbered student instructions and concrete deliverables.
- Rubric of 3-5 criteria whose weights sum to 100, with distinct descriptors per band.
- Realistic estimated hours for the level (${src.level}).
- Language: ${src.language}.`;
  return streamStructured({ schema: AssignmentSetSchema, prompt, onProgress, signal });
}
