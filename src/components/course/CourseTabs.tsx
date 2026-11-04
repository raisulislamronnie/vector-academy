"use client";

import { BookMarked, ChevronLeft, ChevronRight, Clock, Lightbulb, Link2, ListOrdered, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge, Button } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { useI18n } from "@/lib/i18n";
import type { Course } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function OverviewTab({ course, onOpenLesson }: { course: Course; onOpenLesson: (m: number, l: number) => void }) {
  const { t } = useI18n();
  const totalMin = course.modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.durationMinutes, 0), 0);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-subtle uppercase">{t("About this course")}</h2>
          <Markdown>{course.description}</Markdown>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Target className="size-4 text-accent" /> {t("Learning objectives")}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {course.objectives.map((o, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">{t("{n}", { n: i + 1 })}</span>
                <span className="leading-relaxed">{o}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <ListOrdered className="size-4 text-accent" /> {t("Curriculum")}
          </h2>
          <div className="space-y-3">
            {course.modules.map((m, mi) => (
              <div key={mi} className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-start gap-3 bg-surface-2 px-4 py-3">
                  <span className="mt-0.5 font-mono text-xs font-semibold text-accent">M{mi + 1}</span>
                  <div className="min-w-0">
                    <div className="font-medium">{m.title}</div>
                    <p className="mt-0.5 text-[13px] text-muted">{m.overview}</p>
                  </div>
                </div>
                <ul className="divide-y divide-border">
                  {m.lessons.map((l, li) => (
                    <li key={li}>
                      <button
                        onClick={() => onOpenLesson(mi, li)}
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-surface-2"
                      >
                        <span className="w-8 font-mono text-xs text-subtle">
                          {mi + 1}.{li + 1}
                        </span>
                        <span className="flex-1">{l.title}</span>
                        <span className="text-xs text-subtle">{t("{n} min", { n: l.durationMinutes })}</span>
                        <ChevronRight className="size-4 text-subtle" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm">
          {[
            { k: t("{n}", { n: course.modules.length }), v: "Modules" },
            { k: t("{n}", { n: course.modules.reduce((n, m) => n + m.lessons.length, 0) }), v: "Lessons" },
            { k: t("{n}h", { n: Math.round(totalMin / 60) }), v: "Teaching" },
          ].map((s) => (
            <div key={s.v} className="bg-surface p-4 text-center">
              <div className="text-xl font-semibold tabular-nums">{s.k}</div>
              <div className="text-[11px] text-subtle">{t(s.v)}</div>
            </div>
          ))}
        </div>
        {course.prerequisites.length ? (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold">{t("Prerequisites")}</h3>
            <ul className="space-y-1.5 text-sm text-muted">
              {course.prerequisites.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-subtle" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {course.resources.length ? (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Link2 className="size-4 text-accent" /> {t("Resources")}
            </h3>
            <ul className="space-y-3">
              {course.resources.map((r, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge className="shrink-0">{t(r.type)}</Badge>
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted">{r.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {course.glossary.length ? (
          <details className="group rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <BookMarked className="size-4 text-accent" /> {t("Glossary ({n})", { n: course.glossary.length })}
              </span>
              <ChevronRight className="size-4 text-subtle transition group-open:rotate-90" />
            </summary>
            <dl className="mt-3 space-y-2.5">
              {course.glossary.map((g, i) => (
                <div key={i} className="text-sm">
                  <dt className="font-medium">{g.term}</dt>
                  <dd className="text-[13px] text-muted">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </details>
        ) : null}
      </aside>
    </div>
  );
}

export function LessonsTab({ course, initial }: { course: Course; initial: [number, number] }) {
  const { t } = useI18n();
  const flat = course.modules.flatMap((m, mi) => m.lessons.map((l, li) => ({ m, mi, l, li })));
  const [pos, setPos] = useState(() => Math.max(0, flat.findIndex((x) => x.mi === initial[0] && x.li === initial[1])));
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const idx = flat.findIndex((x) => x.mi === initial[0] && x.li === initial[1]);
    if (idx >= 0) setPos(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial[0], initial[1]]);
  const cur = flat[pos];
  if (!cur) return null;
  const select = (i: number) => {
    setPos(i);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]" ref={topRef}>
      <nav className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        {course.modules.map((m, mi) => (
          <div key={mi}>
            <div className="mb-1.5 px-2 text-[11px] font-semibold tracking-wide text-subtle uppercase">
              {t("Module {n}", { n: mi + 1 })} · {m.title}
            </div>
            <ul className="space-y-0.5">
              {m.lessons.map((l, li) => {
                const idx = flat.findIndex((x) => x.mi === mi && x.li === li);
                const active = idx === pos;
                return (
                  <li key={li}>
                    <button
                      onClick={() => select(idx)}
                      className={cn(
                        "flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition",
                        active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-text",
                      )}
                    >
                      <span className="mt-px w-7 shrink-0 font-mono text-[11px] opacity-70">
                        {mi + 1}.{li + 1}
                      </span>
                      <span>{l.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <article key={pos} className="min-w-0 rounded-2xl border border-border bg-surface shadow-sm animate-fade-in">
        <header className="border-b border-border p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
            <Badge tone="accent">
              {t("Lesson {n}", { n: `${cur.mi + 1}.${cur.li + 1}` })}
            </Badge>
            <span>{cur.m.title}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {t("{n} min", { n: cur.l.durationMinutes })}
            </span>
          </div>
          <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{cur.l.title}</h2>
        </header>
        <div className="p-6 sm:p-8">
          <Markdown className="text-[15px]">{cur.l.content}</Markdown>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface-2 p-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Target className="size-4 text-accent" /> {t("Key takeaways")}
              </h3>
              <ul className="space-y-2 text-sm">
                {cur.l.keyTakeaways.map((k, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-warning/25 bg-warning-soft p-5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Lightbulb className="size-4 text-warning" /> {t("Class activity")}
              </h3>
              <Markdown className="text-sm">{cur.l.activity}</Markdown>
            </div>
          </div>
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-border p-4">
          <Button variant="ghost" size="sm" disabled={pos === 0} onClick={() => select(pos - 1)}>
            <ChevronLeft className="size-4" /> {t("Previous")}
          </Button>
          <span className="text-xs text-subtle tabular-nums">
            {t("{n}", { n: pos + 1 })} / {t("{n}", { n: flat.length })}
          </span>
          <Button variant="ghost" size="sm" disabled={pos === flat.length - 1} onClick={() => select(pos + 1)}>
            {t("Next")} <ChevronRight className="size-4" />
          </Button>
        </footer>
      </article>
    </div>
  );
}
