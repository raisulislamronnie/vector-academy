"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Languages,
  ListChecks,
  Lock,
  Paperclip,
  Presentation,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GRADES = [
  "Kindergarten",
  ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
  "Undergraduate",
  "Postgraduate",
  "Adult / Professional",
];

const LANGUAGES = [
  { v: "English", f: "🇺🇸" },
  { v: "Spanish", f: "🇪🇸" },
  { v: "French", f: "🇫🇷" },
  { v: "German", f: "🇩🇪" },
  { v: "Portuguese", f: "🇧🇷" },
  { v: "Arabic", f: "🇸🇦" },
  { v: "Hindi", f: "🇮🇳" },
  { v: "Bengali", f: "🇧🇩" },
  { v: "Chinese", f: "🇨🇳" },
  { v: "Japanese", f: "🇯🇵" },
];

const TYPES = [
  { v: "course", label: "Course", icon: BookOpen, phrase: "full course", hint: "Lessons & activities" },
  { v: "slides", label: "Slides", icon: Presentation, phrase: "slide deck (no course, just the slides)", hint: "With speaker notes" },
  { v: "quiz", label: "MCQ Quiz", icon: ListChecks, phrase: "MCQ quiz (no course, just the quiz)", hint: "With answer key" },
  { v: "assignments", label: "Assignments", icon: ClipboardList, phrase: "set of assignments with rubrics (no course, just the assignments)", hint: "With rubrics" },
] as const;
type TypeV = (typeof TYPES)[number]["v"];

const EXAMPLES: Record<TypeV, string[]> = {
  course: ["Fractions with real-life examples", "Intro to Python programming", "The French Revolution"],
  slides: ["The water cycle, 10 slides", "Newton's laws of motion", "Persuasive writing techniques"],
  quiz: ["Photosynthesis, 15 questions", "World capitals", "Algebra: linear equations"],
  assignments: ["Climate change research project", "Build a budget spreadsheet", "Short story with rubric"],
};

const HISTORY_KEY = "va.promptHistory";
const MAX_ATTACH_CHARS = 12000;
const MAX_TEXT = 2000;

function PillSelect({
  icon,
  value,
  onChange,
  placeholder,
  invalid,
  label,
  children,
}: {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border pr-7 pl-3 text-[13px] font-medium transition",
        invalid
          ? "border-[#e5484d]/50 bg-[#fdeceb] text-[#c62f35]"
          : value
            ? "border-[#ebe6e1] bg-white text-[#1c1917] hover:border-[#ddd5cd]"
            : "border-dashed border-[#ddd5cd] bg-white text-[#6b6460] hover:border-[#ea580c]/50 hover:text-[#1c1917]",
      )}
    >
      <span className="[&>svg]:size-3.5">{icon}</span>
      <span className="max-w-36 truncate">{value || placeholder}</span>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 opacity-60" />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {children}
      </select>
    </label>
  );
}

function ToolButton({ onClick, children, active, label }: { onClick: () => void; children: ReactNode; active?: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition",
        active ? "bg-[#fff1e6] text-[#ea580c]" : "text-[#6b6460] hover:bg-[#f7f4f1] hover:text-[#1c1917]",
      )}
    >
      {children}
    </button>
  );
}

export function LandingComposer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [grade, setGrade] = useState("");
  const [language, setLanguage] = useState("English");
  const [type, setType] = useState<TypeV>("course");
  const [difficulty, setDifficulty] = useState("Balanced");
  const [subject, setSubject] = useState("");
  const [more, setMore] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [touched, setTouched] = useState(false);
  const [going, setGoing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"));
    } catch {}
  }, []);
  useEffect(() => {
    if (!showHistory) return;
    const close = (e: MouseEvent) => !historyRef.current?.contains(e.target as Node) && setShowHistory(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setShowHistory(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [showHistory]);

  const hasText = text.trim().length >= 3;
  const ready = hasText && !!grade && !!language;
  const current = TYPES.find((t) => t.v === type)!;
  const steps = [
    { ok: hasText, label: "Describe it" },
    { ok: !!grade, label: "Pick a grade" },
    { ok: !!language, label: "Choose language" },
  ];

  async function onFile(file: File) {
    if (!/\.(txt|md|csv|json)$/i.test(file.name) && !file.type.startsWith("text/")) {
      toast.error("Attach a text file (.txt, .md, .csv)");
      return;
    }
    const content = await file.text();
    if (content.length > MAX_ATTACH_CHARS) {
      toast.error(`File is too long (${content.length.toLocaleString()} characters). Keep it under ${MAX_ATTACH_CHARS.toLocaleString()}.`);
      return;
    }
    setAttachment({ name: file.name, content });
    toast.success(`Attached ${file.name}`);
  }

  function generate() {
    setTouched(true);
    if (!ready) {
      if (!hasText) {
        toast.error("Describe what you want to create");
        taRef.current?.focus();
      } else toast.error("Pick a grade to continue");
      return;
    }
    setGoing(true);
    const prompt = [
      `Create a ${current.phrase} for ${grade} learners, written in ${language}.`,
      subject.trim() ? `Subject: ${subject.trim()}.` : "",
      difficulty !== "Balanced" ? `Difficulty: ${difficulty}.` : "",
      `Requirement: ${text.trim()}`,
      attachment ? `\n\nReference material from "${attachment.name}":\n${attachment.content}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const next = [text.trim(), ...history.filter((h) => h !== text.trim())].slice(0, 10);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
    router.push(`/chat?q=${encodeURIComponent(prompt)}`);
  }

  return (
    <div className="relative mx-auto max-w-4xl text-left">
      {/* Glow */}
      <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-gradient-to-r from-[#ea580c]/15 via-[#fb923c]/10 to-[#f59e0b]/15 blur-2xl" />

      {/* Gradient ring */}
      <div className="relative rounded-[28px] bg-gradient-to-br from-[#ea580c]/45 via-[#ebe6e1] to-[#f59e0b]/45 p-px shadow-[0_30px_70px_-30px_rgb(28_25_23/0.35)]">
        <div className="rounded-[27px] bg-white p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#ea580c] to-[#f59e0b] text-white shadow-[0_8px_20px_-8px_rgb(234_88_12/0.8)]">
                <Sparkles className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-lg leading-tight sm:text-xl">Try creating any resource</h2>
                <p className="text-[13px] text-[#6b6460]">Free to try · ready in minutes · PDF, Word & PowerPoint</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ebe6e1] bg-[#fcfaf8] px-2.5 py-1 text-[11px] font-medium text-[#6b6460]">
              <span className="size-1.5 animate-pulse rounded-full bg-[#12a46f]" /> AI powered
            </span>
          </div>

          {/* Type tabs */}
          <div role="tablist" aria-label="Resource type" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPES.map(({ v, label, icon: Icon, hint }) => {
              const active = type === v;
              return (
                <button
                  key={v}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setType(v)}
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-2.5 rounded-2xl border p-2.5 text-left transition",
                    active
                      ? "border-[#ea580c] bg-[#fff7f0] shadow-[0_0_0_3px_rgb(234_88_12/0.12)]"
                      : "border-[#efebe7] bg-white hover:border-[#ddd5cd] hover:bg-[#fcfaf8]",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl transition",
                      active ? "bg-[#ea580c] text-white" : "bg-[#f7f4f1] text-[#6b6460] group-hover:text-[#1c1917]",
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-[13px] font-semibold", active ? "text-[#ea580c]" : "text-[#1c1917]")}>{label}</span>
                    <span className="hidden truncate text-[11px] text-[#a39e99] sm:block">{hint}</span>
                  </span>
                  {active ? (
                    <span className="absolute top-2 right-2 grid size-4 place-items-center rounded-full bg-[#ea580c] text-white">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Input */}
          <div
            className={cn(
              "mt-4 rounded-2xl border bg-[#fcfaf8] transition focus-within:border-[#ea580c] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#ea580c]/10",
              touched && !hasText ? "border-[#e5484d]/50" : "border-[#ebe6e1]",
            )}
          >
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  generate();
                }
              }}
              rows={4}
              placeholder={`Describe your ${current.label.toLowerCase()}… topic, goals, anything your learners need`}
              className="block min-h-32 w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed text-[#1c1917] placeholder:text-[#a39e99] focus:outline-none"
              aria-label="Describe your requirement"
            />

            {!text ? (
              <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
                <span className="text-[11px] font-semibold tracking-wide text-[#a39e99] uppercase">Try</span>
                {EXAMPLES[type].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setText(ex);
                      taRef.current?.focus();
                    }}
                    className="cursor-pointer rounded-full border border-[#ebe6e1] bg-white px-2.5 py-1 text-xs text-[#6b6460] transition hover:border-[#ea580c]/40 hover:text-[#ea580c]"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            ) : null}

            {attachment ? (
              <div className="px-4 pb-3">
                <span className="inline-flex max-w-full items-center gap-2 rounded-xl border border-[#fed7b5] bg-[#fff1e6] py-1.5 pr-1.5 pl-2.5 text-xs font-medium text-[#ea580c]">
                  <FileText className="size-3.5 shrink-0" />
                  <span className="truncate">{attachment.name}</span>
                  <span className="text-[#fb923c]">{(attachment.content.length / 1000).toFixed(1)}k chars</span>
                  <button aria-label="Remove attachment" onClick={() => setAttachment(null)} className="grid size-5 cursor-pointer place-items-center rounded-md hover:bg-white">
                    <X className="size-3" />
                  </button>
                </span>
              </div>
            ) : null}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-[#f2eeea] p-2">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.csv,.json,text/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
              <ToolButton label="Attach a file" onClick={() => fileRef.current?.click()} active={!!attachment}>
                <Paperclip className="size-4" />
                <span className="hidden md:inline">Attach</span>
              </ToolButton>

              <div ref={historyRef} className="relative">
                <ToolButton label="Prompt history" onClick={() => setShowHistory((s) => !s)} active={showHistory}>
                  <Clock className="size-4" />
                  <span className="hidden md:inline">History</span>
                </ToolButton>
                {showHistory ? (
                  <div className="absolute bottom-full left-0 z-30 mb-2 w-[min(400px,80vw)] overflow-hidden rounded-2xl border border-[#efebe7] bg-white p-1.5 shadow-[0_24px_48px_-16px_rgb(28_25_23/0.3)] animate-fade-in">
                    <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-[#a39e99] uppercase">Recent prompts</div>
                    {history.length === 0 ? (
                      <p className="px-3 py-5 text-center text-xs text-[#a39e99]">Nothing yet. Your last 10 prompts appear here.</p>
                    ) : (
                      <>
                        {history.map((h) => (
                          <button
                            key={h}
                            onClick={() => {
                              setText(h);
                              setShowHistory(false);
                              taRef.current?.focus();
                            }}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] text-[#1c1917] hover:bg-[#f7f4f1]"
                          >
                            <Clock className="size-3.5 shrink-0 text-[#a39e99]" />
                            <span className="truncate">{h}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setHistory([]);
                            try {
                              localStorage.removeItem(HISTORY_KEY);
                            } catch {}
                            setShowHistory(false);
                          }}
                          className="mt-1 flex w-full cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[#e5484d] hover:bg-[#fdeceb]"
                        >
                          <Trash2 className="size-3.5" /> Clear history
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              <span className="mx-1 hidden h-5 w-px bg-[#ebe6e1] sm:block" />

              <PillSelect
                label="Grade"
                icon={<GraduationCap />}
                value={grade}
                onChange={setGrade}
                placeholder="Grade *"
                invalid={touched && !grade}
              >
                <option value="" disabled>
                  Select grade
                </option>
                {GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </PillSelect>

              <PillSelect
                label="Language"
                icon={<span className="text-sm leading-none">{LANGUAGES.find((l) => l.v === language)?.f ?? <Languages />}</span>}
                value={language}
                onChange={setLanguage}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.v} value={l.v}>
                    {l.f} {l.v}
                  </option>
                ))}
              </PillSelect>

              <ToolButton label="More options" onClick={() => setMore((m) => !m)} active={more}>
                <SlidersHorizontal className="size-4" />
                <span className="hidden md:inline">Options</span>
                {subject || difficulty !== "Balanced" ? <span className="size-1.5 rounded-full bg-[#ea580c]" /> : null}
              </ToolButton>

              <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
                <span className={cn("hidden text-[11px] tabular-nums sm:block", text.length > MAX_TEXT * 0.9 ? "text-[#c98a04]" : "text-[#a39e99]")}>
                  {text.length}/{MAX_TEXT}
                </span>
                <button
                  type="button"
                  onClick={generate}
                  aria-disabled={!ready}
                  disabled={going}
                  className={cn(
                    "group inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition sm:flex-none",
                    ready
                      ? "bg-gradient-to-r from-[#ea580c] to-[#f2700f] text-white shadow-[0_10px_24px_-10px_rgb(234_88_12/0.9)] hover:brightness-110 active:scale-[0.98]"
                      : "bg-[#f1ece7] text-[#a39e99]",
                  )}
                >
                  {going ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : ready ? (
                    <Sparkles className="size-4" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  Generate
                  {ready && !going ? <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /> : null}
                </button>
              </div>
            </div>
          </div>

          {/* More options */}
          {more ? (
            <div className="mt-3 grid gap-3 rounded-2xl border border-[#f2eeea] bg-[#fcfaf8] p-4 sm:grid-cols-[1fr_auto] animate-fade-up">
              <div>
                <label htmlFor="lc-subject" className="mb-1.5 block text-xs font-semibold text-[#1c1917]">
                  Subject <span className="font-normal text-[#a39e99]">optional</span>
                </label>
                <input
                  id="lc-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Mathematics, Biology, History"
                  className="h-10 w-full rounded-xl border border-[#ebe6e1] bg-white px-3.5 text-sm text-[#1c1917] placeholder:text-[#a39e99] focus:border-[#ea580c] focus:ring-4 focus:ring-[#ea580c]/10 focus:outline-none"
                />
              </div>
              <div>
                <div className="mb-1.5 text-xs font-semibold text-[#1c1917]">Difficulty</div>
                <div className="inline-flex h-10 rounded-xl border border-[#ebe6e1] bg-white p-1">
                  {["Easy", "Balanced", "Challenging"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        "cursor-pointer rounded-lg px-3 text-[13px] font-medium transition",
                        difficulty === d ? "bg-[#ea580c] text-white shadow-sm" : "text-[#6b6460] hover:text-[#1c1917]",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Readiness */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            {steps.map((s, i) => (
              <span key={s.label} className={cn("inline-flex items-center gap-1.5 transition", s.ok ? "text-[#12a46f]" : "text-[#a39e99]")}>
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full text-[9px] font-bold transition",
                    s.ok ? "bg-[#12a46f] text-white" : "border border-[#ddd8d3] text-[#a39e99]",
                  )}
                >
                  {s.ok ? <Check className="size-2.5" strokeWidth={3} /> : i + 1}
                </span>
                {s.label}
              </span>
            ))}
            <span className="hidden text-[#cfc8c1] sm:inline">·</span>
            <span className="hidden text-[#a39e99] sm:inline">
              <kbd className="rounded border border-[#ebe6e1] bg-[#fcfaf8] px-1 font-mono text-[10px]">Ctrl</kbd> +{" "}
              <kbd className="rounded border border-[#ebe6e1] bg-[#fcfaf8] px-1 font-mono text-[10px]">Enter</kbd> to generate
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
