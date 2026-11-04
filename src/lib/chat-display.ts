import type { ChatMessage } from "./chat-types";

export interface ToolResultMeta {
  resourceId?: string;
  title?: string;
  courseId?: string;
  courseTitle?: string;
  kind?: string;
}
export type Part =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string; done: boolean }
  | {
      type: "tool";
      id: string;
      name: string;
      label: string;
      input: Record<string, unknown>;
      status: "running" | "done" | "error";
      chars: number;
      progressLabel: string;
      result?: ToolResultMeta;
      error?: string;
    }
  | { type: "notice"; text: string; tone: "warning" | "error" };

export type Item = { id: string; role: "user"; text: string } | { id: string; role: "assistant"; parts: Part[] };

export const TOOL_LABELS: Record<string, string> = {
  create_slides: "Designing slides",
  create_quiz: "Writing MCQ quiz",
  create_assignments: "Drafting assignments",
  create_course: "Building course",
  generate_slides: "Designing slides",
  generate_quiz: "Writing MCQ quiz",
  generate_assignments: "Drafting assignments",
  list_courses: "Checking your library",
};

export function parseToolResult(content: string): { ok: boolean; meta?: ToolResultMeta; error?: string } {
  try {
    const j = JSON.parse(content);
    if (Array.isArray(j)) return { ok: true };
    return { ok: !!j.ok, meta: { resourceId: j.resourceId, title: j.title, courseId: j.courseId, courseTitle: j.courseTitle, kind: j.kind } };
  } catch {
    return { ok: false, error: content.replace(/^(ERROR|INVALID_INPUT):\s*/, "") };
  }
}

/** Converts stored API messages into display items. */
export function toItems(messages: ChatMessage[]): Item[] {
  const items: Item[] = [];
  let n = 0;
  const lastAssistant = () => {
    const last = items[items.length - 1];
    if (last?.role === "assistant") return last;
    const it: Item = { id: `a${n++}`, role: "assistant", parts: [] };
    items.push(it);
    return it;
  };
  for (const m of messages) {
    const blocks = typeof m.content === "string" ? [{ type: "text" as const, text: m.content }] : (m.content ?? []);
    if (m.role === "user") {
      const texts = blocks.filter((b) => b.type === "text") as { text: string }[];
      for (const b of blocks) {
        if (b.type === "tool_result") {
          const a = lastAssistant();
          const part = a.parts.find((p) => p.type === "tool" && p.id === b.tool_use_id);
          if (part && part.type === "tool") {
            const content = b.content;
            const r = parseToolResult(content);
            part.status = b.is_error || !r.ok ? "error" : "done";
            part.result = r.meta;
            part.error = b.is_error ? r.error ?? content : undefined;
          }
        }
      }
      if (texts.length) items.push({ id: `u${n++}`, role: "user", text: texts.map((t) => t.text).join("\n") });
    } else {
      const a = lastAssistant();
      for (const b of blocks) {
        if (b.type === "text" && b.text) a.parts.push({ type: "text", text: b.text });
        else if (b.type === "thinking" && b.thinking) a.parts.push({ type: "thinking", text: b.thinking, done: true });
        else if (b.type === "tool_use")
          a.parts.push({
            type: "tool",
            id: b.id,
            name: b.name,
            label: TOOL_LABELS[b.name] ?? b.name,
            input: (b.input ?? {}) as Record<string, unknown>,
            status: "error",
            chars: 0,
            progressLabel: "",
            error: "Didn't finish (connection closed). Ask again to retry.",
          });
      }
    }
  }
  return items;
}
