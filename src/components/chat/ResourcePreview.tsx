"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  FileType2,
  ListChecks,
  Presentation,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SlideView } from "@/components/course/SlideView";
import { Button, Skeleton } from "@/components/ui";
import type { DocMeta, DocModel } from "@/lib/export/doc-model";
import type { Resource } from "@/lib/schemas";
import { useI18n } from "@/lib/i18n";
import { cn, courseTheme } from "@/lib/utils";

const L = "ABCD";

async function downloadDoc(build: () => DocModel, format: "pdf" | "docx", accent: string) {
  const model = build();
  if (format === "pdf") await (await import("@/lib/export/pdf")).exportPdf(model, accent);
  else await (await import("@/lib/export/docx")).exportDocx(model, accent);
}

function DownloadButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  return (
    <Button
      size="sm"
      variant="outline"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } catch (e) {
          console.error(e);
          toast.error(t("Download failed"));
        } finally {
          setBusy(false);
        }
      }}
    >
      {!busy && icon} {t(label)}
    </Button>
  );
}

function SlidesPreview({ r, theme }: { r: Extract<Resource, { kind: "slides" }>; theme: { from: string; to: string } }) {
  const [i, setI] = useState(0);
  const { t } = useI18n();
  const slides = r.data.slides;
  const total = slides.length;
  return (
    <div className="space-y-3">
      <div className="group relative overflow-hidden rounded-xl border border-border shadow-sm">
        <SlideView key={i} slide={slides[i]} index={i} total={total} theme={theme} courseTitle={r.brief.topic} className="animate-fade-in" />
        <button
          aria-label={t("Previous slide")}
          disabled={i === 0}
          onClick={() => setI((x) => Math.max(0, x - 1))}
          className="absolute top-1/2 left-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 disabled:hidden"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          aria-label={t("Next slide")}
          disabled={i === total - 1}
          onClick={() => setI((x) => Math.min(total - 1, x + 1))}
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 disabled:hidden"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {slides.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={t("Slide {n}", { n: idx + 1 })}
            className={cn(
              "relative w-28 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition",
              idx === i ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
            )}
          >
            <SlideView slide={s} index={idx} total={total} theme={theme} courseTitle={r.brief.topic} />
          </button>
        ))}
      </div>
      {slides[i].speakerNotes ? (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-muted">
          <span className="font-semibold text-text">{t("Notes:")} </span>
          {slides[i].speakerNotes}
        </p>
      ) : null}
    </div>
  );
}

function QuizPreview({ r }: { r: Extract<Resource, { kind: "quiz" }> }) {
  const [all, setAll] = useState(false);
  const [answers, setAnswers] = useState(false);
  const { t } = useI18n();
  const qs = r.data.questions;
  const shown = all ? qs : qs.slice(0, 3);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => setAnswers((a) => !a)}>
          {answers ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {answers ? t("Hide answers") : t("Show answers")}
        </Button>
      </div>
      <ol className="space-y-3">
        {shown.map((q, qi) => (
          <li key={qi} className="rounded-xl border border-border bg-surface p-3.5">
            <div className="text-sm font-medium">
              {t("{n}", { n: qi + 1 })}. {q.question}
            </div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {q.options.map((o, oi) => {
                const correct = answers && oi === q.correctIndex;
                return (
                  <div
                    key={oi}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[13px]",
                      correct ? "border-success/40 bg-success-soft" : "border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                        correct ? "bg-success text-white" : "bg-surface-2 text-muted",
                      )}
                    >
                      {correct ? <Check className="size-3" /> : L[oi]}
                    </span>
                    {o}
                  </div>
                );
              })}
            </div>
            {answers ? <p className="mt-2 text-xs text-muted">{q.explanation}</p> : null}
          </li>
        ))}
      </ol>
      {qs.length > 3 ? (
        <button onClick={() => setAll((a) => !a)} className="w-full cursor-pointer rounded-lg py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft">
          {all ? t("Show fewer") : t("Show all {n} questions", { n: qs.length })}
        </button>
      ) : null}
    </div>
  );
}

function AssignmentsPreview({ r }: { r: Extract<Resource, { kind: "assignments" }> }) {
  const [open, setOpen] = useState(0);
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      {r.data.assignments.map((a, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
          <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full cursor-pointer items-center gap-3 p-3 text-left hover:bg-surface-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-xs font-semibold text-accent">{t("{n}", { n: i + 1 })}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{a.title}</span>
              <span className="flex items-center gap-1 text-xs text-muted">
                {t(a.type.replace("-", " "))} · <Clock className="size-3" /> ~{t("{n}h", { n: a.estimatedHours })} · {t("{n} rubric criteria", { n: a.rubric.length })}
              </span>
            </span>
            <ChevronRight className={cn("size-4 text-subtle transition", open === i && "rotate-90")} />
          </button>
          {open === i ? (
            <div className="border-t border-border p-3.5 text-[13px]">
              <p className="text-muted">{a.overview}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {a.instructions.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

const ICON = { slides: Presentation, quiz: ListChecks, assignments: ClipboardList };

/** Inline view + downloads for standalone slides / quizzes / assignments in chat. */
export function ResourcePreview({ id }: { id: string }) {
  const [r, setR] = useState<Resource | null | undefined>(undefined);
  const { t } = useI18n();
  useEffect(() => {
    fetch(`/api/resources/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setR)
      .catch(() => setR(null));
  }, [id]);

  if (r === undefined) return <Skeleton className="h-64 w-full" />;
  if (r === null) return <div className="rounded-xl bg-surface-2 p-3 text-sm text-muted">{t("This item is no longer available.")}</div>;

  const theme = courseTheme(r.brief.topic);
  const meta: DocMeta = { title: r.brief.topic, level: r.brief.audience || "All levels" };
  const Icon = ICON[r.kind];
  const subtitle =
    r.kind === "slides"
      ? t("{n} slides", { n: r.data.slides.length })
      : r.kind === "quiz"
        ? `${t("{n} questions", { n: r.data.questions.length })} · ${t("answer key")}`
        : `${t(r.data.assignments.length > 1 ? "{n} assignments" : "{n} assignment", { n: r.data.assignments.length })} · ${t("rubrics")}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm animate-fade-up">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="truncate">{r.title}</span> <Check className="size-3.5 shrink-0 text-success" />
          </div>
          <div className="truncate text-xs text-muted">
            {subtitle}
            {r.brief.audience ? ` · ${r.brief.audience}` : ""} · {t(r.brief.language)}
          </div>
        </div>
      </div>
      <div className="p-4">
        {r.kind === "slides" ? <SlidesPreview r={r} theme={theme} /> : r.kind === "quiz" ? <QuizPreview r={r} /> : <AssignmentsPreview r={r} />}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-2/60 px-4 py-3">
        <span className="mr-1 inline-flex items-center gap-1 text-xs text-subtle">
          <Download className="size-3.5" /> {t("Download")}
        </span>
        {r.kind === "slides" ? (
          <>
            <DownloadButton
              label="PowerPoint"
              icon={<Presentation className="size-3.5" />}
              onClick={async () => (await import("@/lib/export/pptx")).exportPptx(r.data, r.brief.topic, theme)}
            />
            <DownloadButton
              label="Handout PDF"
              icon={<FileText className="size-3.5" />}
              onClick={async () => {
                const { slidesDoc } = await import("@/lib/export/doc-model");
                await downloadDoc(() => slidesDoc(meta, r.data), "pdf", theme.from);
              }}
            />
          </>
        ) : r.kind === "quiz" ? (
          <>
            <DownloadButton
              label="Student PDF"
              icon={<FileText className="size-3.5" />}
              onClick={async () => {
                const { quizDoc } = await import("@/lib/export/doc-model");
                await downloadDoc(() => quizDoc(meta, r.data, false), "pdf", theme.from);
              }}
            />
            <DownloadButton
              label="Answer key PDF"
              icon={<FileText className="size-3.5" />}
              onClick={async () => {
                const { quizDoc } = await import("@/lib/export/doc-model");
                await downloadDoc(() => quizDoc(meta, r.data, true), "pdf", theme.from);
              }}
            />
            <DownloadButton
              label="Word"
              icon={<FileType2 className="size-3.5" />}
              onClick={async () => {
                const { quizDoc } = await import("@/lib/export/doc-model");
                await downloadDoc(() => quizDoc(meta, r.data, true), "docx", theme.from);
              }}
            />
          </>
        ) : (
          <>
            <DownloadButton
              label="PDF"
              icon={<FileText className="size-3.5" />}
              onClick={async () => {
                const { assignmentsDoc } = await import("@/lib/export/doc-model");
                await downloadDoc(() => assignmentsDoc(meta, r.data), "pdf", theme.from);
              }}
            />
            <DownloadButton
              label="Word"
              icon={<FileType2 className="size-3.5" />}
              onClick={async () => {
                const { assignmentsDoc } = await import("@/lib/export/doc-model");
                await downloadDoc(() => assignmentsDoc(meta, r.data), "docx", theme.from);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
