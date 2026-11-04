"use client";

import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  LayoutGrid,
  ListChecks,
  MoreHorizontal,
  Presentation,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { CourseCover } from "@/components/CourseCard";
import { AssignmentsTab } from "@/components/course/AssignmentsTab";
import { LessonsTab, OverviewTab } from "@/components/course/CourseTabs";
import { ExportMenu } from "@/components/course/ExportMenu";
import { QuizTab } from "@/components/course/QuizTab";
import { ShareDialog } from "@/components/course/ShareDialog";
import { SlidesTab } from "@/components/course/SlidesTab";
import { Badge, Button, EmptyState, Menu, Skeleton } from "@/components/ui";
import { courseDoc } from "@/lib/export/doc-model";
import { useI18n } from "@/lib/i18n";
import type { Course } from "@/lib/schemas";
import { cn, courseTheme, timeAgo } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "lessons", label: "Lessons", icon: BookOpen },
  { id: "slides", label: "Slides", icon: Presentation },
  { id: "quiz", label: "MCQ Quiz", icon: ListChecks },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
] as const;
type TabId = (typeof TABS)[number]["id"];

function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [lesson, setLesson] = useState<[number, number]>([0, 0]);
  const [sharing, setSharing] = useState(false);
  const { t: tr, lang } = useI18n();
  const tab = (TABS.some((t) => t.id === search.get("tab")) ? search.get("tab") : "overview") as TabId;

  useEffect(() => {
    fetch(`/api/courses/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setCourse)
      .catch(() => setCourse(null));
  }, [id]);

  const setTab = (t: TabId) => router.replace(`/courses/${id}${t === "overview" ? "" : `?tab=${t}`}`, { scroll: false });

  if (course === undefined) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-8">
        <Skeleton className="h-52" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (course === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState
          icon={<BookOpen className="size-6" />}
          title={tr("Course not found")}
          description={tr("It may have been deleted.")}
          action={
            <Link href="/courses">
              <Button variant="outline">{tr("Back to library")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const theme = courseTheme(course.subject);
  const counts: Partial<Record<TabId, string>> = {
    lessons: String(course.modules.reduce((n, m) => n + m.lessons.length, 0)),
    slides: course.slides ? String(course.slides.slides.length) : "",
    quiz: course.quiz ? String(course.quiz.questions.length) : "",
    assignments: course.assignments ? String(course.assignments.assignments.length) : "",
  };

  async function remove() {
    if (!confirm(tr("Delete “{s}”? This cannot be undone.", { s: course!.title }))) return;
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    toast.success(tr("Course deleted"));
    router.push("/courses");
  }

  return (
    <div className="pb-16">
      <div className="relative">
        <CourseCover seed={course.subject} className="h-44 sm:h-52" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
        <div className="absolute top-4 left-4 sm:left-8">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/35"
          >
            <ArrowLeft className="size-3.5" /> {tr("Library")}
          </Link>
        </div>
      </div>

      <div className="relative mx-auto -mt-20 max-w-6xl px-4 sm:px-8">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-lg sm:p-7 animate-fade-up">
          <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{tr(course.level)}</Badge>
                <Badge>{course.subject}</Badge>
                <Badge>{course.duration}</Badge>
                {course.language !== "English" ? <Badge>{tr(course.language)}</Badge> : null}
              </div>
              <h1 className="mt-3 font-display text-3xl leading-[1.1] tracking-tight sm:text-[44px]">{course.title}</h1>
              <p className="mt-2 max-w-3xl text-muted">{course.subtitle}</p>
              <p className="mt-3 text-xs text-subtle">
                {tr("For {a}", { a: course.audience })} · {tr("by {name}", { name: course.author })} · {timeAgo(course.createdAt, lang)}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSharing(true)}>
                <Share2 className="size-3.5" /> {tr("Share")}
              </Button>
              <ExportMenu
                accent={theme.from}
                label={tr("Download course")}
                options={[
                  { label: tr("Full course book"), format: "pdf", build: () => courseDoc(course) },
                  { label: tr("Full course book"), format: "docx", build: () => courseDoc(course) },
                ]}
              />
              <Menu
                trigger={(p) => (
                  <Button variant="ghost" size="icon-sm" aria-label={tr("More")} {...p}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                )}
                items={[
                  {
                    label: tr("Refine with AI"),
                    icon: <Sparkles />,
                    onClick: () =>
                      router.push(
                        `/chat?q=${encodeURIComponent(`For my course "${course.title}" (courseId: ${course.id}), `)}&draft=1`,
                      ),
                  },
                  "sep",
                  { label: tr("Delete course"), icon: <Trash2 />, danger: true, onClick: remove },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-20 -mx-4 mt-6 border-b border-border bg-bg/85 px-4 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="flex gap-1 overflow-x-auto" role="tablist">
            {TABS.map(({ id: t, label, icon: Icon }) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "relative flex cursor-pointer items-center gap-2 px-3 py-3.5 text-sm font-medium whitespace-nowrap transition",
                  tab === t ? "text-text" : "text-muted hover:text-text",
                )}
              >
                <Icon className={cn("size-4", tab === t ? "text-accent" : "")} />
                {tr(label)}
                {counts[t] ? (
                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted tabular-nums">{tr("{n}", { n: Number(counts[t]) })}</span>
                ) : t !== "overview" && t !== "lessons" ? (
                  <span className="size-1.5 rounded-full bg-accent/60" title={tr("Not generated yet")} />
                ) : null}
                {tab === t ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {tab === "overview" && (
            <OverviewTab
              course={course}
              onOpenLesson={(m, l) => {
                setLesson([m, l]);
                setTab("lessons");
              }}
            />
          )}
          {tab === "lessons" && <LessonsTab course={course} initial={lesson} />}
          {tab === "slides" && <SlidesTab course={course} onUpdate={setCourse} />}
          {tab === "quiz" && <QuizTab course={course} onUpdate={setCourse} />}
          {tab === "assignments" && <AssignmentsTab course={course} onUpdate={setCourse} />}
        </div>
      </div>

      <ShareDialog open={sharing} onClose={() => setSharing(false)} courseId={course.id} courseTitle={course.title} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <CoursePage />
    </Suspense>
  );
}
