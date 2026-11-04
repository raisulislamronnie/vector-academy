"use client";

import {
  AlertTriangle,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  ListChecks,
  Loader2,
  Presentation,
  Search,
} from "lucide-react";
import Link from "next/link";
import { memo, useState } from "react";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";
import { Avatar, Button } from "@/components/ui";
import { ResourcePreview } from "./ResourcePreview";
import type { Item, Part } from "@/lib/chat-display";
import type { Course } from "@/lib/schemas";
import { useI18n } from "@/lib/i18n";
import type { Profile } from "@/lib/user";
import { cn, courseTheme } from "@/lib/utils";

const TOOL_ICON: Record<string, typeof BookOpen> = {
  create_slides: Presentation,
  create_quiz: ListChecks,
  create_assignments: ClipboardList,
  create_course: BookOpen,
  generate_slides: Presentation,
  generate_quiz: ListChecks,
  generate_assignments: ClipboardList,
  list_courses: Search,
};
const DONE_LABELS: Record<string, string> = {
  create_slides: "Slide deck ready",
  create_quiz: "MCQ quiz ready",
  create_assignments: "Assignments ready",
  create_course: "Course created",
  generate_slides: "Slide deck ready",
  generate_quiz: "MCQ quiz ready",
  generate_assignments: "Assignments ready",
};
const EXPECTED: Record<string, number> = { create_slides: 7000, create_quiz: 9000, create_assignments: 10000,  create_course: 20000, generate_slides: 7000, generate_quiz: 9000, generate_assignments: 10000 };

async function quickDownload(courseId: string, kind: string, format: "pdf" | "docx" | "pptx") {
  const res = await fetch(`/api/courses/${courseId}`);
  if (!res.ok) throw new Error("Course not found");
  const course = (await res.json()) as Course;
  const theme = courseTheme(course.subject);
  if (format === "pptx") {
    const { exportPptx } = await import("@/lib/export/pptx");
    if (!course.slides) throw new Error("No slides yet");
    return exportPptx(course.slides, course.title, theme);
  }
  const m = await import("@/lib/export/doc-model");
  const model =
    kind === "quiz" && course.quiz
      ? m.quizDoc(course, course.quiz, true)
      : kind === "assignments" && course.assignments
        ? m.assignmentsDoc(course, course.assignments)
        : kind === "slides" && course.slides
          ? m.slidesDoc(course, course.slides)
          : m.courseDoc(course);
  if (format === "pdf") return (await import("@/lib/export/pdf")).exportPdf(model, theme.from);
  return (await import("@/lib/export/docx")).exportDocx(model, theme.from);
}

function ToolCard({ part }: { part: Extract<Part, { type: "tool" }> }) {
  const Icon = TOOL_ICON[part.name] ?? BookOpen;
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const subject = String(part.input.subject ?? part.result?.courseTitle ?? "");
  const pct = Math.min(96, 6 + (part.chars / (EXPECTED[part.name] ?? 8000)) * 90);
  const kind = part.result?.kind ?? "course";
  const href = part.result?.courseId ? `/courses/${part.result.courseId}${kind !== "course" ? `?tab=${kind}` : ""}` : null;

  const formats: ("pdf" | "docx" | "pptx")[] = kind === "slides" ? ["pptx", "pdf"] : ["pdf", "docx"];
  const dl = async (f: "pdf" | "docx" | "pptx") => {
    setBusy(f);
    try {
      await quickDownload(part.result!.courseId!, kind, f);
    } catch (e) {
      toast.error(e instanceof Error ? t(e.message) : t("Download failed"));
    } finally {
      setBusy(null);
    }
  };

  if (part.status === "done" && part.result?.resourceId) return <ResourcePreview id={part.result.resourceId} />;

  if (part.name === "list_courses") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted">
        {part.status === "running" ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />} {t(part.label)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface shadow-sm transition",
        part.status === "error" ? "border-danger/30" : "border-border",
      )}
    >
      <div className="relative flex items-center gap-3 p-4">
        {part.status === "running" ? <div className="shimmer pointer-events-none absolute inset-0 opacity-50" /> : null}
        <div
          className={cn(
            "relative grid size-10 shrink-0 place-items-center rounded-xl",
            part.status === "done" ? "bg-success-soft text-success" : part.status === "error" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent",
          )}
        >
          {part.status === "running" ? <Loader2 className="size-5 animate-spin" /> : part.status === "done" ? <Icon className="size-5" /> : <AlertTriangle className="size-5" />}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {t(part.status === "done" ? (DONE_LABELS[part.name] ?? part.label) : part.label)}
            {part.status === "done" ? <Check className="size-3.5 text-success" /> : null}
          </div>
          <div className="truncate text-xs text-muted">
            {part.status === "running"
              ? part.progressLabel
                ? `${t("Writing:")} ${part.progressLabel}`
                : subject
                  ? t("Planning “{s}”…", { s: subject })
                  : t("Planning…")
              : part.status === "error"
                ? t(part.error ?? "Failed")
                : part.result?.courseTitle ?? subject}
          </div>
        </div>
        {part.status === "done" && href ? (
          <Link href={href} className="relative">
            <Button size="sm" variant="outline">
              {t("Open")} <ExternalLink className="size-3.5" />
            </Button>
          </Link>
        ) : null}
      </div>
      {part.status === "running" ? (
        <div className="h-1 bg-surface-2">
          <div className="h-full bg-gradient-to-r from-accent to-[#f59e0b] transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {part.status === "done" && part.result?.courseId ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border bg-surface-2/60 px-4 py-2.5">
          <span className="mr-1 text-xs text-subtle">{t("Download")}</span>
          {formats.map((f) => (
            <Button key={f} size="sm" variant="ghost" className="h-7 px-2 text-xs" loading={busy === f} onClick={() => dl(f)}>
              {busy !== f && <Download className="size-3" />} {f === "pptx" ? "PowerPoint" : f === "pdf" ? "PDF" : "Word"}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Thinking({ part }: { part: Extract<Part, { type: "thinking" }> }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <div className="text-sm">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-subtle hover:text-muted">
        <Brain className={cn("size-3.5", !part.done && "animate-pulse text-accent")} />
        {part.done ? t("Thought process") : t("Thinking…")}
        <ChevronRight className={cn("size-3 transition", open && "rotate-90")} />
      </button>
      {open ? <div className="mt-2 border-l-2 border-border pl-3 text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{part.text}</div> : null}
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage({ item, profile, streaming }: { item: Item; profile: Profile | null | undefined; streaming?: boolean }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  if (item.role === "user") {
    return (
      <div className="flex justify-end gap-3 animate-fade-up">
        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-accent px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-accent-fg shadow-sm">
          {item.text}
        </div>
        {profile ? <Avatar name={profile.name} color={profile.color} size={30} className="mt-0.5 hidden sm:inline-flex" /> : null}
      </div>
    );
  }
  const text = item.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("\n\n");
  const empty = item.parts.length === 0;

  return (
    <div className="group flex gap-3 animate-fade-up">
      <div className="mt-0.5 grid size-[30px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#f59e0b] text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 6l7 12 7-12" />
        </svg>
      </div>
      <div className="min-w-0 flex-1 space-y-3 pt-0.5">
        {empty && streaming ? (
          <div className="flex h-7 items-center gap-1">
            <span className="typing-dot size-1.5 rounded-full bg-subtle" />
            <span className="typing-dot size-1.5 rounded-full bg-subtle" />
            <span className="typing-dot size-1.5 rounded-full bg-subtle" />
          </div>
        ) : null}
        {item.parts.map((p, i) =>
          p.type === "text" ? (
            <Markdown key={i}>{p.text}</Markdown>
          ) : p.type === "thinking" ? (
            <Thinking key={i} part={p} />
          ) : p.type === "tool" ? (
            <ToolCard key={p.id} part={p} />
          ) : (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm",
                p.tone === "error" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning",
              )}
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {t(p.text)}
            </div>
          ),
        )}
        {text && !streaming ? (
          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => {
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs text-subtle hover:bg-surface-2 hover:text-text"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? t("Copied") : t("Copy")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
});
