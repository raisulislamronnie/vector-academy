import "server-only";
import { getCourse, newId, saveCourse, saveResource, updateCourse } from "./db";
import { generateAssignments, generateCourse, generateQuiz, generateSlides, type ProgressFn } from "./generate";
import {
  AssignmentsRequestSchema,
  QuizRequestSchema,
  SlidesRequestSchema,
  type Brief,
  type Course,
  type CourseRequest,
  type MaterialKind,
  type Resource,
} from "./schemas";

export async function createCourse(
  req: CourseRequest,
  author: string,
  onProgress?: ProgressFn,
  signal?: AbortSignal,
): Promise<Course> {
  const content = await generateCourse(req, onProgress, signal);
  const course: Course = {
    ...content,
    id: newId(),
    subject: req.subject,
    language: req.language,
    author,
    createdAt: new Date().toISOString(),
    slides: null,
    quiz: null,
    assignments: null,
  };
  await saveCourse(course);
  return course;
}

export async function createMaterial(
  courseId: string,
  kind: MaterialKind,
  rawOptions: unknown,
  onProgress?: ProgressFn,
  signal?: AbortSignal,
): Promise<Course> {
  const course = await getCourse(courseId);
  if (!course) throw new Error("Course not found");
  const opts = (rawOptions ?? {}) as object;

  if (kind === "slides") {
    const deck = await generateSlides(course, SlidesRequestSchema.parse(opts), onProgress, signal);
    return (await updateCourse(courseId, { slides: deck }))!;
  }
  if (kind === "quiz") {
    const quiz = await generateQuiz(course, QuizRequestSchema.parse(opts), onProgress, signal);
    return (await updateCourse(courseId, { quiz }))!;
  }
  const set = await generateAssignments(course, AssignmentsRequestSchema.parse(opts), onProgress, signal);
  return (await updateCourse(courseId, { assignments: set }))!;
}

/** Slides, quiz or assignments made straight from a brief, without a course. */
export async function createStandalone(
  kind: MaterialKind,
  brief: Brief,
  rawOptions: unknown,
  author: string,
  onProgress?: ProgressFn,
  signal?: AbortSignal,
): Promise<Resource> {
  const opts = (rawOptions ?? {}) as object;
  const base = { id: newId(), author, createdAt: new Date().toISOString(), brief };
  let resource: Resource;
  if (kind === "slides") {
    const data = await generateSlides(brief, SlidesRequestSchema.parse(opts), onProgress, signal);
    resource = { ...base, kind, data, title: data.deckTitle };
  } else if (kind === "quiz") {
    const data = await generateQuiz(brief, QuizRequestSchema.parse(opts), onProgress, signal);
    resource = { ...base, kind, data, title: data.title };
  } else {
    const data = await generateAssignments(brief, AssignmentsRequestSchema.parse(opts), onProgress, signal);
    resource = { ...base, kind, data, title: data.assignments[0]?.title ?? `Assignments: ${brief.topic}` };
  }
  await saveResource(resource);
  return resource;
}
