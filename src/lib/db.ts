import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ChatMessage } from "./chat-types";
import type { Content as GeminiContent } from "@google/genai";
import type { Course, CourseSummary, Group, GroupMessage, Resource } from "./schemas";

/**
 * Tiny JSON-file database. Good for a single-instance deployment / local use.
 * Swap for Postgres/SQLite when you scale horizontally.
 */

export interface Conversation {
  id: string;
  title: string;
  ownerId: string;
  /** Display log rendered by the chat UI. */
  messages: ChatMessage[];
  /** Raw Gemini history, replayed as-is so thought signatures stay valid. */
  gemini?: GeminiContent[];
  createdAt: string;
  updatedAt: string;
}

interface Data {
  courses: Course[];
  resources: Resource[];
  conversations: Conversation[];
  groups: Group[];
  groupMessages: GroupMessage[];
}

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const SEED_GROUPS: Omit<Group, "id" | "createdAt">[] = [
  { name: "Staff Room", description: "General chat for all tutors", emoji: "☕" },
  { name: "STEM Faculty", description: "Maths, science, computing & engineering", emoji: "🧪" },
  { name: "Humanities & Languages", description: "History, literature, languages, social sciences", emoji: "📚" },
  { name: "Exam Prep Lab", description: "Share quizzes, mock papers & revision strategies", emoji: "🎯" },
];

const g = globalThis as unknown as { __vaData?: Data; __vaWrite?: Promise<void> };

async function load(): Promise<Data> {
  if (g.__vaData) {
    g.__vaData.resources ??= []; // data loaded before this field existed
    return g.__vaData;
  }
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    g.__vaData = JSON.parse(raw) as Data;
    g.__vaData.resources ??= [];
  } catch {
    const now = new Date().toISOString();
    g.__vaData = {
      courses: [],
      resources: [],
      conversations: [],
      groups: SEED_GROUPS.map((s) => ({ ...s, id: randomUUID(), createdAt: now })),
      groupMessages: [],
    };
    await persist();
  }
  return g.__vaData!;
}

function persist(): Promise<void> {
  const run = async () => {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(g.__vaData), "utf8");
    await fs.rename(tmp, DB_PATH);
  };
  g.__vaWrite = (g.__vaWrite ?? Promise.resolve()).then(run, run);
  return g.__vaWrite;
}

export const newId = () => randomUUID();

/* ---------- Courses ---------- */

export function toSummary(c: Course): CourseSummary {
  return {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    subject: c.subject,
    level: c.level,
    author: c.author,
    createdAt: c.createdAt,
    duration: c.duration,
    moduleCount: c.modules.length,
    lessonCount: c.modules.reduce((n, m) => n + m.lessons.length, 0),
    hasSlides: !!c.slides,
    hasQuiz: !!c.quiz,
    hasAssignments: !!c.assignments,
  };
}

export async function listCourses(): Promise<CourseSummary[]> {
  const d = await load();
  return [...d.courses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(toSummary);
}

export async function getCourse(id: string): Promise<Course | null> {
  const d = await load();
  return d.courses.find((c) => c.id === id) ?? null;
}

export async function saveCourse(course: Course): Promise<void> {
  const d = await load();
  const i = d.courses.findIndex((c) => c.id === course.id);
  if (i >= 0) d.courses[i] = course;
  else d.courses.push(course);
  await persist();
}

export async function updateCourse(id: string, patch: Partial<Course>): Promise<Course | null> {
  const d = await load();
  const c = d.courses.find((x) => x.id === id);
  if (!c) return null;
  Object.assign(c, patch);
  await persist();
  return c;
}

export async function deleteCourse(id: string): Promise<boolean> {
  const d = await load();
  const before = d.courses.length;
  d.courses = d.courses.filter((c) => c.id !== id);
  await persist();
  return d.courses.length !== before;
}

/* ---------- Standalone resources ---------- */

export async function getResource(id: string): Promise<Resource | null> {
  const d = await load();
  return d.resources.find((r) => r.id === id) ?? null;
}

export async function saveResource(r: Resource): Promise<void> {
  const d = await load();
  d.resources.push(r);
  await persist();
}

/* ---------- Conversations ---------- */

export async function listConversations(ownerId: string) {
  const d = await load();
  return d.conversations
    .filter((c) => c.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(({ id, title, updatedAt, messages }) => ({ id, title, updatedAt, ...summarize(messages) }));
}

const KIND_BY_TOOL: Record<string, string> = {
  create_course: "course",
  create_slides: "slides",
  generate_slides: "slides",
  create_quiz: "quiz",
  generate_quiz: "quiz",
  create_assignments: "assignments",
  generate_assignments: "assignments",
};

/** Last assistant text (short) and the main kind of material made, for the chat list. */
function summarize(messages: ChatMessage[]) {
  let preview = "";
  let kind = "chat";
  for (const m of messages) {
    if (m.role !== "assistant" || typeof m.content === "string") continue;
    for (const b of m.content) {
      if (b.type === "text" && b.text.trim()) preview = b.text;
      if (b.type === "tool_use" && KIND_BY_TOOL[b.name] && kind === "chat") kind = KIND_BY_TOOL[b.name];
    }
  }
  preview = preview.replace(/[#*_`>|-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
  return { preview, kind, count: messages.filter((m) => m.role === "user" && typeof m.content === "string").length };
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const d = await load();
  return d.conversations.find((c) => c.id === id) ?? null;
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const d = await load();
  conv.updatedAt = new Date().toISOString();
  const i = d.conversations.findIndex((c) => c.id === conv.id);
  if (i >= 0) d.conversations[i] = conv;
  else d.conversations.push(conv);
  await persist();
}

export async function deleteConversation(id: string, ownerId: string): Promise<void> {
  const d = await load();
  d.conversations = d.conversations.filter((c) => !(c.id === id && c.ownerId === ownerId));
  await persist();
}

/* ---------- Groups ---------- */

export async function listGroups() {
  const d = await load();
  return d.groups.map((grp) => {
    const msgs = d.groupMessages.filter((m) => m.groupId === grp.id);
    const last = msgs[msgs.length - 1];
    return { ...grp, messageCount: msgs.length, lastMessage: last ?? null };
  });
}

export async function getGroup(id: string) {
  const d = await load();
  return d.groups.find((x) => x.id === id) ?? null;
}

export async function createGroup(input: Omit<Group, "id" | "createdAt">): Promise<Group> {
  const d = await load();
  const grp: Group = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  d.groups.push(grp);
  await persist();
  return grp;
}

export async function listGroupMessages(groupId: string, limit = 200): Promise<GroupMessage[]> {
  const d = await load();
  return d.groupMessages.filter((m) => m.groupId === groupId).slice(-limit);
}

export async function addGroupMessage(msg: Omit<GroupMessage, "id" | "createdAt">): Promise<GroupMessage> {
  const d = await load();
  const full: GroupMessage = { ...msg, id: randomUUID(), createdAt: new Date().toISOString() };
  d.groupMessages.push(full);
  await persist();
  return full;
}
