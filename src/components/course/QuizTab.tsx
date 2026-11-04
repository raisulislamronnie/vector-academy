"use client";

import { Check, Eye, GraduationCap, RotateCcw, Trophy, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Segmented } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { quizDoc } from "@/lib/export/doc-model";
import { useI18n } from "@/lib/i18n";
import type { Course } from "@/lib/schemas";
import { cn, courseTheme } from "@/lib/utils";
import { ExportMenu } from "./ExportMenu";
import { MaterialGenerator } from "./MaterialGenerator";

const L = "ABCDEFGH";
const DIFF_TONE = { easy: "success", medium: "warning", hard: "danger" } as const;

export function QuizTab({ course, onUpdate }: { course: Course; onUpdate: (c: Course) => void }) {
  const quiz = course.quiz;
  const { t } = useI18n();
  const [mode, setMode] = useState<"practice" | "key">("practice");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const theme = courseTheme(course.subject);

  const score = useMemo(
    () => (quiz ? quiz.questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0) : 0),
    [answers, quiz],
  );

  if (!quiz) return <MaterialGenerator course={course} kind="quiz" onDone={onUpdate} />;

  const total = quiz.questions.length;
  const answered = Object.keys(answers).length;
  const reset = () => {
    setAnswers({});
    setSubmitted(false);
  };
  const pct = Math.round((score / total) * 100);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{quiz.title}</h2>
          <p className="text-sm text-muted">
            {t("{n} questions", { n: total })} · {quiz.instructions}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            className="w-auto"
            value={mode}
            onChange={(m) => {
              setMode(m);
              reset();
            }}
            options={[
              { value: "practice", label: <span className="inline-flex items-center gap-1.5"><GraduationCap className="size-3.5" /> {t("Practice")}</span> },
              { value: "key", label: <span className="inline-flex items-center gap-1.5"><Eye className="size-3.5" /> {t("Answer key")}</span> },
            ]}
          />
          <ExportMenu
            accent={theme.from}
            options={[
              { label: t("Student paper"), format: "pdf", build: () => quizDoc(course, quiz, false) },
              { label: t("Answer key + explanations"), format: "pdf", build: () => quizDoc(course, quiz, true) },
              { label: t("Student paper"), format: "docx", build: () => quizDoc(course, quiz, false) },
              { label: t("Answer key + explanations"), format: "docx", build: () => quizDoc(course, quiz, true) },
            ]}
          />
        </div>
      </div>

      {mode === "practice" && submitted ? (
        <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-gradient-to-br from-accent-soft to-surface p-5 shadow-sm animate-fade-up">
          <div className="relative grid size-20 place-items-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-3)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 97.4} 97.4`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="text-lg font-bold tabular-nums">{t("{n}", { n: pct })}%</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 font-semibold">
              <Trophy className="size-4 text-warning" /> {t("{a} of {b} correct", { a: score, b: total })}
            </div>
            <p className="mt-1 text-sm text-muted">
              {t(pct >= 80 ? "Excellent mastery!" : pct >= 50 ? "Good effort — review the explanations below." : "Keep practising — the explanations below will help.")}
            </p>
          </div>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="size-4" /> {t("Try again")}
          </Button>
        </div>
      ) : null}

      <ol className="space-y-4">
        {quiz.questions.map((q, qi) => {
          const chosen = answers[qi];
          const reveal = mode === "key" || submitted;
          return (
            <li key={qi} className="rounded-2xl border border-border bg-surface p-5 shadow-sm animate-fade-up" style={{ animationDelay: `${Math.min(qi, 10) * 25}ms` }}>
              <div className="mb-3 flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-xs font-semibold text-muted">{t("{n}", { n: qi + 1 })}</span>
                <div className="min-w-0 flex-1">
                  <Markdown className="font-medium [&_p]:leading-snug">{q.question}</Markdown>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={DIFF_TONE[q.difficulty]}>{t(q.difficulty[0].toUpperCase() + q.difficulty.slice(1))}</Badge>
                    <Badge>{q.topic}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.correctIndex;
                  const isChosen = chosen === oi;
                  return (
                    <button
                      key={oi}
                      disabled={reveal}
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition",
                        !reveal && "cursor-pointer hover:border-accent/50 hover:bg-surface-2",
                        !reveal && isChosen && "border-accent bg-accent-soft",
                        !reveal && !isChosen && "border-border",
                        reveal && isCorrect && "border-success/50 bg-success-soft",
                        reveal && !isCorrect && isChosen && "border-danger/50 bg-danger-soft",
                        reveal && !isCorrect && !isChosen && "border-border opacity-70",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                          reveal && isCorrect
                            ? "bg-success text-white"
                            : reveal && isChosen
                              ? "bg-danger text-white"
                              : isChosen
                                ? "bg-accent text-white"
                                : "bg-surface-2 text-muted",
                        )}
                      >
                        {reveal && isCorrect ? <Check className="size-3.5" /> : reveal && isChosen ? <X className="size-3.5" /> : L[oi]}
                      </span>
                      <span className="pt-0.5">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {reveal ? (
                <div className="mt-3 rounded-xl bg-surface-2 p-3.5 text-sm text-muted animate-fade-in">
                  <span className="font-semibold text-text">{t("Answer {x}.", { x: L[q.correctIndex] })} </span>
                  {q.explanation}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {mode === "practice" && !submitted ? (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 p-3 pl-5 shadow-lg backdrop-blur">
          <span className="text-sm text-muted">
            <span className="font-semibold text-text tabular-nums">{t("{n}", { n: answered })}</span> / {t("{n} answered", { n: total })}
          </span>
          <Button onClick={() => setSubmitted(true)} disabled={answered === 0}>
            {t("Check answers")}
          </Button>
        </div>
      ) : null}

      <div className="flex justify-end">
        <MaterialGenerator course={course} kind="quiz" onDone={onUpdate} compact />
      </div>
    </div>
  );
}
