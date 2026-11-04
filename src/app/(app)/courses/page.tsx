"use client";

import { BookOpen, PlusCircle, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import { Button, EmptyState, Input, Skeleton } from "@/components/ui";
import type { CourseSummary } from "@/lib/schemas";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Beginner", "Intermediate", "Advanced", "Expert"];

export default function CoursesPage() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("All");

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return (courses ?? []).filter(
      (c) =>
        (level === "All" || c.level.toLowerCase().includes(level.toLowerCase())) &&
        (!s || `${c.title} ${c.subject} ${c.subtitle} ${c.author}`.toLowerCase().includes(s)),
    );
  }, [courses, q, level]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{t("Course library")}</h1>
          <p className="mt-2 text-muted">
            {courses ? t(courses.length === 1 ? "{n} course" : "{n} courses", { n: courses.length }) : t("Loading")} ·{" "}
            {t("open one to view lessons, slides, quizzes and assignments.")}
          </p>
        </div>
        <Link href="/courses/new">
          <Button>
            <PlusCircle className="size-4" /> {t("New course")}
          </Button>
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search by title, subject or author…")} className="pl-10" />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-2 p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setLevel(f)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition",
                level === f ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
              )}
            >
              {t(f)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {courses === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen className="size-6" />}
            title={courses.length ? t("No matches") : t("Your library is empty")}
            description={courses.length ? t("Try a different search or level.") : t("Generate a course and it will show up here.")}
            action={
              !courses.length ? (
                <Link href="/courses/new">
                  <Button>
                    <PlusCircle className="size-4" /> {t("Create a course")}
                  </Button>
                </Link>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
