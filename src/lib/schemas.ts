import { z } from "zod";

/* ---------- AI output schemas (structured outputs) ---------- */

export const LessonSchema = z.object({
  title: z.string(),
  durationMinutes: z.number().describe("Estimated teaching time in minutes"),
  content: z
    .string()
    .describe(
      "Full lesson notes in GitHub-flavored Markdown: explanations, worked examples, analogies. Use ### subheadings, lists and **bold** key terms.",
    ),
  keyTakeaways: z.array(z.string()),
  activity: z.string().describe("One short in-class activity or discussion prompt"),
});

export const ModuleSchema = z.object({
  title: z.string(),
  overview: z.string(),
  lessons: z.array(LessonSchema),
});

export const CourseContentSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  level: z.string(),
  audience: z.string(),
  duration: z.string().describe('Human-readable total duration, e.g. "6 weeks · 18 hours"'),
  prerequisites: z.array(z.string()),
  objectives: z.array(z.string()),
  modules: z.array(ModuleSchema),
  glossary: z.array(z.object({ term: z.string(), definition: z.string() })),
  resources: z.array(
    z.object({ title: z.string(), type: z.string(), description: z.string() }),
  ),
});

export const SlideSchema = z.object({
  layout: z.enum(["title", "bullets", "two-column", "quote", "summary"]),
  title: z.string(),
  subtitle: z.string().describe("Empty string if unused"),
  bullets: z.array(z.string()).describe("Empty for title/quote/two-column layouts"),
  columns: z
    .array(z.object({ heading: z.string(), bullets: z.array(z.string()) }))
    .describe("Exactly two entries for two-column layout, otherwise empty"),
  quote: z.string().describe("Quote or key statement for quote layout, otherwise empty"),
  speakerNotes: z.string(),
});

export const SlideDeckSchema = z.object({
  deckTitle: z.string(),
  slides: z.array(SlideSchema),
});

export const McqSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).describe("Exactly four answer options, no letter prefixes"),
  correctIndex: z.number().describe("0-based index of the correct option"),
  explanation: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topic: z.string(),
});

export const QuizSchema = z.object({
  title: z.string(),
  instructions: z.string(),
  questions: z.array(McqSchema),
});

export const AssignmentSchema = z.object({
  title: z.string(),
  type: z.enum(["essay", "project", "problem-set", "research", "presentation", "practical", "case-study"]),
  overview: z.string(),
  objectives: z.array(z.string()),
  instructions: z.array(z.string()).describe("Ordered steps for the student"),
  deliverables: z.array(z.string()),
  rubric: z.array(
    z.object({
      criterion: z.string(),
      weight: z.number().describe("Percentage weight; all weights sum to 100"),
      excellent: z.string(),
      satisfactory: z.string(),
      needsImprovement: z.string(),
    }),
  ),
  estimatedHours: z.number(),
  dueGuidance: z.string(),
});

export const AssignmentSetSchema = z.object({
  assignments: z.array(AssignmentSchema),
});

export type Lesson = z.infer<typeof LessonSchema>;
export type Module = z.infer<typeof ModuleSchema>;
export type CourseContent = z.infer<typeof CourseContentSchema>;
export type Slide = z.infer<typeof SlideSchema>;
export type SlideDeck = z.infer<typeof SlideDeckSchema>;
export type Mcq = z.infer<typeof McqSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type AssignmentSet = z.infer<typeof AssignmentSetSchema>;

/* ---------- Request inputs ---------- */

export const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
export const DEPTHS = ["brief", "standard", "comprehensive"] as const;

export const CourseRequestSchema = z.object({
  subject: z.string().min(2).max(200).describe("Subject or course topic, e.g. 'Organic Chemistry'"),
  focus: z.string().max(500).default("").describe("Specific angle, syllabus or exam board, if any"),
  level: z.enum(LEVELS).default("Intermediate"),
  audience: z.string().max(200).default("").describe("Who the learners are, e.g. 'Grade 10 students'"),
  moduleCount: z.number().int().min(2).max(10).default(5),
  depth: z.enum(DEPTHS).default("standard"),
  language: z.string().max(40).default("English"),
  notes: z.string().max(1500).default("").describe("Any extra tutor requirements"),
});
export type CourseRequest = z.infer<typeof CourseRequestSchema>;

export const SlidesRequestSchema = z.object({
  slideCount: z.number().int().min(5).max(40).default(12),
  focus: z.string().max(500).default("").describe("Module/lesson to focus on, or empty for whole course"),
});
export const QuizRequestSchema = z.object({
  questionCount: z.number().int().min(3).max(50).default(15),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
  focus: z.string().max(500).default(""),
});
export const AssignmentsRequestSchema = z.object({
  count: z.number().int().min(1).max(6).default(3),
  focus: z.string().max(500).default(""),
});

export type MaterialKind = "slides" | "quiz" | "assignments";

/** Brief for standalone material made without a course. */
export const BriefSchema = z.object({
  topic: z.string().min(2).max(300).describe("What the material is about, e.g. 'The water cycle'"),
  audience: z.string().max(200).default("").describe("Grade or learners, e.g. 'Grade 6'"),
  language: z.string().max(40).default("English"),
  notes: z.string().max(1500).default("").describe("Extra requirements from the tutor"),
});
export type Brief = z.infer<typeof BriefSchema>;

/** Slides, quiz or assignments created directly from a brief (no course). */
export type Resource = {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  brief: Brief;
} & (
  | { kind: "slides"; data: SlideDeck }
  | { kind: "quiz"; data: Quiz }
  | { kind: "assignments"; data: AssignmentSet }
);

/* ---------- Stored records ---------- */

export interface Course extends CourseContent {
  id: string;
  subject: string;
  language: string;
  author: string;
  createdAt: string;
  slides: SlideDeck | null;
  quiz: Quiz | null;
  assignments: AssignmentSet | null;
}

export type CourseSummary = Pick<
  Course,
  "id" | "title" | "subtitle" | "subject" | "level" | "author" | "createdAt" | "duration"
> & {
  moduleCount: number;
  lessonCount: number;
  hasSlides: boolean;
  hasQuiz: boolean;
  hasAssignments: boolean;
};

export interface Group {
  id: string;
  name: string;
  description: string;
  emoji: string;
  createdAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  kind: "text" | "ai" | "share" | "system";
  text: string;
  courseId?: string;
  courseTitle?: string;
  createdAt: string;
}

export const UserSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(60),
  color: z.string().max(32),
});
export type User = z.infer<typeof UserSchema>;
