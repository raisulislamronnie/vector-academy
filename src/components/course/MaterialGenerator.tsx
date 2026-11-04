"use client";

import { ClipboardList, ListChecks, Presentation, RefreshCw, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { GenerationProgress } from "@/components/GenerationProgress";
import { Button, Input, Label, Segmented } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { Course, MaterialKind } from "@/lib/schemas";
import { readNdjson } from "@/lib/utils";

const META: Record<
  MaterialKind,
  { title: string; desc: string; icon: typeof Presentation; stages: string[]; perUnit: number; unit: string }
> = {
  slides: {
    title: "Slide deck",
    desc: "A presentation-ready deck with speaker notes. Present in the browser or download as PowerPoint.",
    icon: Presentation,
    stages: ["Storyboarding", "Writing slides", "Speaker notes", "Polish"],
    perUnit: 520,
    unit: "slides",
  },
  quiz: {
    title: "MCQ quiz",
    desc: "Multiple-choice questions with an answer key, explanations and difficulty tags. Practise interactively or print.",
    icon: ListChecks,
    stages: ["Choosing concepts", "Writing questions", "Crafting distractors", "Explanations"],
    perUnit: 620,
    unit: "questions",
  },
  assignments: {
    title: "Assignments",
    desc: "Student-ready briefs with step-by-step instructions, deliverables and weighted grading rubrics.",
    icon: ClipboardList,
    stages: ["Designing tasks", "Instructions", "Deliverables", "Rubrics"],
    perUnit: 3200,
    unit: "assignments",
  },
};

export function MaterialGenerator({
  course,
  kind,
  onDone,
  compact = false,
}: {
  course: Course;
  kind: MaterialKind;
  onDone: (c: Course) => void;
  compact?: boolean;
}) {
  const meta = META[kind];
  const { t } = useI18n();
  const what = t(meta.title);
  const [count, setCount] = useState(kind === "slides" ? 12 : kind === "quiz" ? 15 : 3);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [focus, setFocus] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ chars: 0, label: "" });
  const [open, setOpen] = useState(!compact);
  const abortRef = useRef<AbortController | null>(null);

  const limits = kind === "slides" ? [5, 40] : kind === "quiz" ? [3, 50] : [1, 6];

  async function run() {
    setRunning(true);
    setProgress({ chars: 0, label: "" });
    const ac = new AbortController();
    abortRef.current = ac;
    const options =
      kind === "slides"
        ? { slideCount: count, focus }
        : kind === "quiz"
          ? { questionCount: count, difficulty, focus }
          : { count, focus };
    try {
      const res = await fetch(`/api/courses/${course.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, options }),
        signal: ac.signal,
      });
      let updated: Course | null = null;
      await readNdjson<{ type: string; chars?: number; label?: string; course?: Course; message?: string }>(res, (e) => {
        if (e.type === "progress") setProgress({ chars: e.chars ?? 0, label: e.label ?? "" });
        if (e.type === "done") updated = e.course!;
        if (e.type === "error") throw new Error(e.message);
      });
      if (!updated) throw new Error(t("Generation ended unexpectedly"));
      toast.success(t("{s} ready", { s: what }));
      onDone(updated);
      if (compact) setOpen(false);
    } catch (err) {
      if (ac.signal.aborted) toast(t("Cancelled"));
      else toast.error(err instanceof Error ? t(err.message) : t("Generation failed"));
    } finally {
      setRunning(false);
    }
  }

  if (running) {
    return (
      <div className="space-y-3">
        <GenerationProgress
          title={t("Generating {s}", { s: what.toLowerCase() })}
          chars={progress.chars}
          label={progress.label}
          expected={count * meta.perUnit}
          stages={meta.stages.map((x) => t(x))}
        />
        <div className="text-right">
          <Button variant="ghost" size="sm" onClick={() => abortRef.current?.abort()}>
            {t("Cancel")}
          </Button>
        </div>
      </div>
    );
  }

  if (compact && !open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <RefreshCw className="size-3.5" /> {t("Regenerate")}
      </Button>
    );
  }

  const Icon = meta.icon;
  const form = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label hint={t(`{n} ${meta.unit}`, { n: count })}>{t("How many?")}</Label>
          <input
            type="range"
            min={limits[0]}
            max={limits[1]}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--accent)]"
            aria-label={t("How many?")}
          />
        </div>
        <div>
          <Label hint={t("Optional")}>{t("Focus")}</Label>
          <Input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder={t("Whole course, or e.g. “{s}”", { s: course.modules[0]?.title ?? t("Module {n}", { n: 1 }) })}
            maxLength={500}
          />
        </div>
      </div>
      {kind === "quiz" ? (
        <div>
          <Label>{t("Difficulty")}</Label>
          <Segmented
            value={difficulty}
            onChange={setDifficulty}
            options={[
              { value: "easy", label: t("Easy") },
              { value: "medium", label: t("Medium") },
              { value: "hard", label: t("Hard") },
              { value: "mixed", label: t("Mixed") },
            ]}
          />
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        {compact ? (
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("Cancel")}
          </Button>
        ) : null}
        <Button onClick={run}>
          <Wand2 className="size-4" /> {compact ? t("Regenerate") : t("Generate {s}", { s: what.toLowerCase() })}
        </Button>
      </div>
    </div>
  );

  if (compact) return <div className="w-full rounded-2xl border border-border bg-surface p-5 shadow-sm animate-fade-up">{form}</div>;

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-surface p-6 shadow-sm animate-fade-up sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Icon className="size-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{t("Generate {s}", { s: what.toLowerCase() })}</h3>
          <p className="mt-1 text-sm text-muted">{t(meta.desc)}</p>
        </div>
      </div>
      {form}
    </div>
  );
}
