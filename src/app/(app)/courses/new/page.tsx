"use client";

import { ArrowLeft, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CourseCover } from "@/components/CourseCard";
import { GenerationProgress } from "@/components/GenerationProgress";
import { Button, Card, Input, Label, Segmented, Textarea } from "@/components/ui";
import { DEPTHS, LEVELS, type CourseRequest } from "@/lib/schemas";
import { useI18n } from "@/lib/i18n";
import { useProfile } from "@/lib/user";
import { readNdjson } from "@/lib/utils";

const EXPECTED: Record<CourseRequest["depth"], number> = { brief: 2600, standard: 4200, comprehensive: 6400 };
const LANGS = [
  { value: "English", label: "English" },
  { value: "Bangla", label: "বাংলা (Bangla)" },
];
const IDEAS = ["Quantum Physics", "Creative Writing", "Machine Learning", "World War II", "Financial Literacy", "Spanish for Travel", "Calculus I", "Digital Marketing"];

export default function NewCoursePage() {
  const router = useRouter();
  const profile = useProfile();
  const { t, lang } = useI18n();
  const [form, setForm] = useState<CourseRequest>({
    subject: "",
    focus: "",
    level: "Intermediate",
    audience: "",
    moduleCount: 5,
    depth: "standard",
    language: "English",
    notes: "",
  });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ chars: 0, label: "" });
  const abortRef = useRef<AbortController | null>(null);
  // Course language follows the studio language; the tutor can still pick the other one.
  useEffect(() => setForm((f) => ({ ...f, language: lang === "bn" ? "Bangla" : "English" })), [lang]);
  const set = <K extends keyof CourseRequest>(k: K, v: CourseRequest[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function generate() {
    if (form.subject.trim().length < 2) return toast.error(t("Tell us the subject first"));
    setRunning(true);
    setProgress({ chars: 0, label: "" });
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: form, author: profile?.name ?? "Tutor" }),
        signal: ac.signal,
      });
      let courseId: string | null = null;
      await readNdjson<{ type: string; chars?: number; label?: string; courseId?: string; message?: string }>(res, (e) => {
        if (e.type === "progress") setProgress({ chars: e.chars ?? 0, label: e.label ?? "" });
        if (e.type === "done") courseId = e.courseId!;
        if (e.type === "error") throw new Error(e.message);
      });
      if (!courseId) throw new Error("Generation ended unexpectedly");
      toast.success(t("Course created!"));
      router.push(`/courses/${courseId}`);
    } catch (err) {
      if (ac.signal.aborted) toast(t("Generation cancelled"));
      else toast.error(err instanceof Error ? t(err.message) : t("Generation failed"));
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> {t("Library")}
      </Link>
      <div className="mt-4 mb-8">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{t("Create a course")}</h1>
        <p className="mt-2 text-muted">{t("Describe what you want to teach. Vector writes a complete, teach-ready course.")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {running ? (
            <>
              <GenerationProgress
                title={t("Building “{s}”", { s: form.subject })}
                chars={progress.chars}
                label={progress.label}
                expected={EXPECTED[form.depth] * form.moduleCount}
                stages={["Mapping objectives", "Structuring modules", "Writing lesson notes", "Examples & activities", "Glossary & resources", "Final polish"].map((x) => t(x))}
              />
              <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 p-4 text-sm text-muted">
                <span>{t("Courses usually take 1–4 minutes. You can keep this tab open while Vector writes.")}</span>
                <Button variant="ghost" size="sm" onClick={() => abortRef.current?.abort()}>
                  {t("Cancel")}
                </Button>
              </div>
            </>
          ) : (
            <Card className="p-5 sm:p-7 animate-fade-up">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="subject">{t("Subject or topic")}</Label>
                  <Input
                    id="subject"
                    autoFocus
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    placeholder={t("e.g. Organic Chemistry, Shakespeare's Tragedies, Intro to UX Design")}
                    className="h-12 text-[15px]"
                    maxLength={200}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {IDEAS.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => set("subject", t(i))}
                        className="cursor-pointer rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted transition hover:bg-accent-soft hover:text-accent"
                      >
                        {t(i)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="audience" hint={t("Optional")}>{t("Audience")}</Label>
                    <Input id="audience" value={form.audience} onChange={(e) => set("audience", e.target.value)} placeholder={t("e.g. Grade 10 students")} maxLength={200} />
                  </div>
                  <div>
                    <Label htmlFor="focus" hint={t("Optional")}>{t("Focus / syllabus")}</Label>
                    <Input id="focus" value={form.focus} onChange={(e) => set("focus", e.target.value)} placeholder={t("e.g. Cambridge IGCSE 0620")} maxLength={500} />
                  </div>
                </div>

                <div>
                  <Label>{t("Level")}</Label>
                  <Segmented value={form.level} onChange={(v) => set("level", v)} options={LEVELS.map((l) => ({ value: l, label: t(l) }))} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label hint={t("{n} modules", { n: form.moduleCount })}>{t("Length")}</Label>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      value={form.moduleCount}
                      onChange={(e) => set("moduleCount", Number(e.target.value))}
                      className="mt-2 w-full accent-[var(--accent)]"
                      aria-label={t("Number of modules")}
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-subtle">
                      <span>{t("{n}", { n: 2 })}</span>
                      <span>{t("{n}", { n: 10 })}</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lang">{t("Language")}</Label>
                    <select
                      id="lang"
                      value={form.language}
                      onChange={(e) => set("language", e.target.value)}
                      className="h-11 w-full cursor-pointer rounded-xl border border-border bg-surface px-3 text-sm shadow-sm focus:border-accent focus:outline-none"
                    >
                      {LANGS.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>{t("Depth")}</Label>
                  <Segmented
                    value={form.depth}
                    onChange={(v) => set("depth", v)}
                    options={DEPTHS.map((d) => ({ value: d, label: t(d[0].toUpperCase() + d.slice(1)) }))}
                  />
                  <p className="mt-1.5 text-xs text-subtle">
                    {form.depth === "brief"
                      ? t("Quick outline with short notes — fastest.")
                      : form.depth === "standard"
                        ? t("Balanced lesson notes with examples.")
                        : t("In-depth notes with multiple worked examples — slower.")}
                  </p>
                </div>

                <div>
                  <Label htmlFor="notes" hint={t("Optional")}>{t("Anything else?")}</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder={t("e.g. Include real-world case studies from Bangladesh; avoid calculus; students are visual learners.")}
                    maxLength={1500}
                  />
                </div>

                <Button size="lg" className="w-full" onClick={generate} disabled={form.subject.trim().length < 2}>
                  <Wand2 className="size-4" /> {t("Generate course")}
                </Button>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <CourseCover seed={form.subject || "preview"} label={t(form.level)} className="h-32" />
            <div className="p-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">{t("Preview")}</div>
              <div className="mt-1 text-lg font-semibold tracking-tight">{form.subject || t("Your course title")}</div>
              <div className="mt-1 text-sm text-muted">
                {form.audience || t("Learners")} · {t("{n} modules", { n: form.moduleCount })} ·{" "}
                {LANGS.find((l) => l.value === form.language)?.label ?? form.language}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 text-sm shadow-sm">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-accent" /> {t("What you’ll get")}
            </div>
            <ul className="mt-3 space-y-2 text-muted">
              {["Learning objectives & prerequisites", "Modules with full lesson notes", "Key takeaways & class activities", "Glossary & curated resources", "Then: slides, MCQ quiz & assignments", "Export to PDF and Word"].map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" /> {t(x)}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
