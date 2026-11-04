"use client";

import { ChevronLeft, ChevronRight, Download, Expand, FileText, StickyNote, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { Course } from "@/lib/schemas";
import { courseTheme, cn } from "@/lib/utils";
import { MaterialGenerator } from "./MaterialGenerator";
import { SlideView } from "./SlideView";

export function SlidesTab({ course, onUpdate }: { course: Course; onUpdate: (c: Course) => void }) {
  const deck = course.slides;
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const theme = courseTheme(course.subject);
  const total = deck?.slides.length ?? 0;

  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(total - 1, x + d))), [total]);

  useEffect(() => {
    if (!deck) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea")) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") (e.preventDefault(), go(1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") (e.preventDefault(), go(-1));
      if (e.key === "Escape") setPresenting(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck, go]);

  useEffect(() => {
    const onFs = () => !document.fullscreenElement && setPresenting(false);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => setI(0), [deck]);

  if (!deck) return <MaterialGenerator course={course} kind="slides" onDone={onUpdate} />;

  const slide = deck.slides[Math.min(i, total - 1)];

  async function download(kind: "pptx" | "pdf") {
    setBusy(kind);
    try {
      if (kind === "pptx") {
        const { exportPptx } = await import("@/lib/export/pptx");
        await exportPptx(deck!, course.title, theme);
      } else {
        const [{ exportPdf }, { slidesDoc }] = await Promise.all([import("@/lib/export/pdf"), import("@/lib/export/doc-model")]);
        await exportPdf(slidesDoc(course, deck!), theme.from);
      }
    } catch (e) {
      console.error(e);
      toast.error(t("Export failed"));
    } finally {
      setBusy(null);
    }
  }

  const present = async () => {
    setPresenting(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {}
  };

  if (presenting) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black" onClick={() => go(1)}>
        <div className="w-full max-w-[177.78vh]">
          <SlideView slide={slide} index={i} total={total} theme={theme} courseTitle={course.title} />
        </div>
        <button
          aria-label={t("Exit presentation")}
          onClick={(e) => {
            e.stopPropagation();
            setPresenting(false);
            if (document.fullscreenElement) document.exitFullscreen();
          }}
          className="absolute top-4 right-4 grid size-10 cursor-pointer place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
          {t("{n}", { n: i + 1 })} / {t("{n}", { n: total })} · {t("← → to navigate · Esc to exit")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{deck.deckTitle}</h2>
          <p className="text-sm text-muted">{t("{n} slides", { n: total })} · {t("use ← → keys to navigate")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={present}>
            <Expand className="size-3.5" /> {t("Present")}
          </Button>
          <Button variant="outline" size="sm" loading={busy === "pdf"} onClick={() => download("pdf")}>
            {busy !== "pdf" && <FileText className="size-3.5" />} {t("Handout PDF")}
          </Button>
          <Button size="sm" loading={busy === "pptx"} onClick={() => download("pptx")}>
            {busy !== "pptx" && <Download className="size-3.5" />} PowerPoint
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,860px)_240px] xl:justify-center">
        <div className="space-y-3">
          <div ref={stageRef} className="group relative overflow-hidden rounded-2xl border border-border shadow-lg">
            <SlideView key={i} slide={slide} index={i} total={total} theme={theme} courseTitle={course.title} className="animate-fade-in" />
            <button
              aria-label={t("Previous slide")}
              onClick={() => go(-1)}
              disabled={i === 0}
              className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 disabled:hidden"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              aria-label={t("Next slide")}
              onClick={() => go(1)}
              disabled={i === total - 1}
              className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 disabled:hidden"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon-sm" onClick={() => go(-1)} disabled={i === 0} aria-label={t("Previous")}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((i + 1) / total) * 100}%` }} />
            </div>
            <span className="w-14 text-center font-mono text-xs text-muted tabular-nums">
              {t("{n}", { n: i + 1 })}/{t("{n}", { n: total })}
            </span>
            <Button variant="outline" size="icon-sm" onClick={() => go(1)} disabled={i === total - 1} aria-label={t("Next")}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {slide.speakerNotes ? (
            <div className="rounded-2xl border border-border bg-surface p-4 text-sm shadow-sm">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-subtle uppercase">
                <StickyNote className="size-3.5" /> {t("Speaker notes")}
              </div>
              <p className="leading-relaxed text-muted">{slide.speakerNotes}</p>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 xl:max-h-[620px] xl:flex-col xl:overflow-x-visible xl:overflow-y-auto xl:pr-1 xl:pb-0">
          {deck.slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={cn(
                "relative w-44 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition xl:w-full",
                idx === i ? "border-accent shadow-md" : "border-transparent opacity-75 hover:opacity-100",
              )}
              aria-label={t("Slide {n}", { n: idx + 1 })}
            >
              <SlideView slide={s} index={idx} total={total} theme={theme} courseTitle={course.title} />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-medium text-white">{t("{n}", { n: idx + 1 })}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <MaterialGenerator course={course} kind="slides" onDone={onUpdate} compact />
      </div>
    </div>
  );
}
