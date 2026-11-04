"use client";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Animated multi-stage progress for long AI generations. `expected` = rough output size in chars. */
export function GenerationProgress({
  chars,
  label,
  expected,
  stages,
  title,
  done = false,
}: {
  chars: number;
  label: string;
  expected: number;
  stages: string[];
  title: string;
  done?: boolean;
}) {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (done) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [done]);

  // Before tokens arrive the model is planning; show a slow creep to 8%.
  const pct = done ? 100 : chars === 0 ? Math.min(8, elapsed * 0.4) : Math.min(97, 8 + (chars / expected) * 89);
  const stageIdx = done ? stages.length : Math.min(stages.length - 1, Math.floor((pct / 100) * stages.length));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm animate-fade-up">
      <div className="relative border-b border-border p-5">
        <div className="shimmer pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
            {done ? <Check className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{title}</div>
            <div className="truncate text-[13px] text-muted">
              {done ? t("Complete") : chars === 0 ? t("Planning the structure…") : label ? <>{t("Writing:")} <span className="text-text">{label}</span></> : t("Writing…")}
            </div>
          </div>
          <div className="text-right font-mono text-xs text-subtle tabular-nums">
            {t("{n}", { n: `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}` })}
          </div>
        </div>
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-[#f59e0b] transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ol className="grid gap-px bg-border sm:grid-cols-2">
        {stages.map((s, i) => (
          <li key={s} className="flex items-center gap-2.5 bg-surface px-5 py-3 text-[13px]">
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full text-[10px] font-semibold transition",
                i < stageIdx ? "bg-success text-white" : i === stageIdx ? "bg-accent text-white" : "bg-surface-2 text-subtle",
              )}
            >
              {i < stageIdx ? <Check className="size-3" /> : t("{n}", { n: i + 1 })}
            </span>
            <span className={i <= stageIdx ? "text-text" : "text-subtle"}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
