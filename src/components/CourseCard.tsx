"use client";
import { BookOpen, ClipboardList, ListChecks, Presentation } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { CourseSummary } from "@/lib/schemas";
import { courseTheme, timeAgo } from "@/lib/utils";

export function CourseCover({ seed, label, className = "h-28" }: { seed: string; label?: string; className?: string }) {
  const theme = courseTheme(seed);
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
      <svg className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden>
        <defs>
          <pattern id={`p-${seed.length}`} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#p-${seed.length})`} />
      </svg>
      <div className="absolute -right-8 -bottom-12 size-40 rounded-full bg-white/15 blur-[1px]" />
      <div className="absolute -top-10 right-16 size-24 rounded-full bg-white/10" />
      {label ? (
        <span className="absolute top-3 left-3 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export function CourseCard({ course, index = 0 }: { course: CourseSummary; index?: number }) {
  const { t, lang } = useI18n();
  const mats = [
    { on: true, icon: BookOpen, label: t("{n} lessons", { n: course.lessonCount }) },
    { on: course.hasSlides, icon: Presentation, label: t("Slides") },
    { on: course.hasQuiz, icon: ListChecks, label: t("Quiz") },
    { on: course.hasAssignments, icon: ClipboardList, label: t("Assignments") },
  ];
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <CourseCover seed={course.subject} label={t(course.level)} />
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">{course.subject}</div>
        <h3 className="mt-1 line-clamp-2 font-semibold leading-snug tracking-tight group-hover:text-accent">{course.title}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] text-muted">{course.subtitle}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {mats.map(({ on, icon: Icon, label }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${on ? "bg-accent-soft text-accent" : "bg-surface-2 text-subtle line-through decoration-subtle/40"}`}
            >
              <Icon className="size-3" /> {label}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-subtle">
          <span className="truncate">{t("by {name}", { name: course.author })}</span>
          <span>{timeAgo(course.createdAt, lang)}</span>
        </div>
      </div>
    </Link>
  );
}
