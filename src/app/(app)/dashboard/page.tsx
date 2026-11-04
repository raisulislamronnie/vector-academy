"use client";

import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  ClipboardList,
  Layers,
  ListChecks,
  MessagesSquare,
  PlusCircle,
  Presentation,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import type { CourseSummary } from "@/lib/schemas";
import { useI18n } from "@/lib/i18n";
import { useProfile } from "@/lib/user";

const SUGGESTIONS = [
  "6-week IGCSE Chemistry course on bonding",
  "Intro Python for 14-year-olds + 15-question quiz",
  "Business English for professionals",
  "University Microeconomics with assignments",
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const router = useRouter();
  const profile = useProfile();
  const { t } = useI18n();
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [prompt, setPrompt] = useState("");
  const [hello, setHello] = useState("Welcome");

  useEffect(() => {
    setHello(greeting());
    fetch("/api/courses")
      .then((r) => r.json())
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  const go = (q: string) => q.trim() && router.push(`/chat?q=${encodeURIComponent(q.trim())}`);
  const stats = [
    { label: "Courses", value: courses?.length ?? 0, icon: BookOpen, tint: "bg-[#fff1e6] text-[#ea580c]" },
    { label: "Lessons", value: courses?.reduce((n, c) => n + c.lessonCount, 0) ?? 0, icon: Layers, tint: "bg-[#fef3c7] text-[#b45309]" },
    { label: "Slide decks", value: courses?.filter((c) => c.hasSlides).length ?? 0, icon: Presentation, tint: "bg-[#fff3e8] text-[#d9730d]" },
    { label: "Quizzes", value: courses?.filter((c) => c.hasQuiz).length ?? 0, icon: ListChecks, tint: "bg-[#e6f7ef] text-[#12a46f]" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {/* Hero composer */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-10 animate-fade-up">
          <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)] opacity-70" />
          <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[#ea580c]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-40 size-56 rounded-full bg-[#f59e0b]/15 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-success" /> {t(hello)}
              {profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
            </div>
            <h1 className="mt-4 max-w-2xl font-display text-4xl leading-[1.05] sm:text-5xl">
              {t("What will you")} <span className="text-gradient">{t("teach today?")}</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
              {t("Describe a course. Vector writes lessons, slides, MCQ quizzes and assignments, ready for PDF, Word or PowerPoint.")}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                go(prompt);
              }}
              className="mt-7 flex max-w-2xl items-end gap-2 rounded-2xl border border-border-strong bg-surface p-2 pl-4 shadow-md transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10"
            >
              <Sparkles className="mb-3 size-4 shrink-0 text-accent" />
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    go(prompt);
                  }
                }}
                rows={2}
                placeholder={t("e.g. A 4-module course on photosynthesis for Grade 9, with slides and a quiz")}
                className="min-h-[52px] flex-1 resize-none bg-transparent py-2 text-[15px] placeholder:text-subtle focus:outline-none"
              />
              <Button type="submit" size="icon" disabled={!prompt.trim()} aria-label={t("Ask Vector")}>
                <ArrowUp className="size-4" />
              </Button>
            </form>
            <div className="mt-3 flex max-w-2xl flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => go(t("Create a {s}", { s: t(s) }))}
                  className="cursor-pointer rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-accent-soft hover:text-accent"
                >
                  {t(s)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-1 xl:grid-rows-4">
          {stats.map(({ label, value, icon: Icon, tint }, i) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm animate-fade-up"
              style={{ animationDelay: `${60 + i * 40}ms` }}
            >
              <span className={`grid size-11 place-items-center rounded-xl ${tint}`}>
                <Icon className="size-5" />
              </span>
              <div>
                <div className="font-display text-2xl leading-none tabular-nums">
                  {courses === null ? <Skeleton className="h-6 w-8" /> : t("{n}", { n: value })}
                </div>
                <div className="mt-1 text-xs text-muted">{t(label)}</div>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Quick actions */}
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/courses/new", icon: PlusCircle, title: "Create a course", desc: "Guided builder with full notes" },
          { href: "/chat", icon: Sparkles, title: "AI Assistant", desc: "Plan, generate, refine by chat" },
          { href: "/courses", icon: ClipboardList, title: "Course library", desc: "Slides, quizzes, assignments" },
          { href: "/groups", icon: MessagesSquare, title: "Group chat", desc: "Collaborate with tutors" },
        ].map(({ href, icon: Icon, title, desc }, i) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg animate-fade-up"
            style={{ animationDelay: `${120 + i * 40}ms` }}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-2 text-text transition group-hover:border-accent/30 group-hover:bg-accent group-hover:text-white">
              <Icon className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{t(title)}</span>
              <span className="block truncate text-xs text-muted">{t(desc)}</span>
            </span>
            <ArrowRight className="size-4 text-subtle transition group-hover:translate-x-0.5 group-hover:text-accent" />
          </Link>
        ))}
      </section>

      {/* Recent */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl">{t("Recent courses")}</h2>
            <p className="text-sm text-muted">{t("Everything you and your colleagues have built.")}</p>
          </div>
          {courses?.length ? (
            <Link href="/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
              {t("View all")} <ArrowRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
        {courses === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : courses.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen className="size-6" />}
            title={t("No courses yet")}
            description={t("Create your first course in a few minutes. Just name a subject.")}
            action={
              <Link href="/courses/new">
                <Button>
                  <PlusCircle className="size-4" /> {t("Create a course")}
                </Button>
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
