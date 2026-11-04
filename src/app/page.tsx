import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  Download,
  FileText,
  FileType2,
  GraduationCap,
  Languages,
  ListChecks,
  MessagesSquare,
  Presentation,
  School,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingComposer } from "@/components/LandingComposer";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Vector Academy — Build any course in minutes with AI",
};

const SUBJECTS = [
  "Biology", "Calculus", "Python", "World History", "IELTS English", "Organic Chemistry", "Economics", "Physics",
  "Creative Writing", "Accounting", "Spanish", "Machine Learning", "Psychology", "Geography", "Music Theory", "Statistics",
];

const FEATURES = [
  { icon: BookOpen, title: "Complete courses", desc: "Objectives, modules, full lesson notes, worked examples, activities, glossary and resources.", span: "lg:col-span-2" },
  { icon: Presentation, title: "Slide decks", desc: "Presentation-ready slides with speaker notes. Present in browser or export to PowerPoint." },
  { icon: ListChecks, title: "MCQ quizzes", desc: "Questions with plausible distractors, answer keys, explanations and difficulty tags." },
  { icon: ClipboardList, title: "Assignments & rubrics", desc: "Step-by-step briefs, deliverables and weighted grading rubrics." },
  { icon: MessagesSquare, title: "Tutor group chat", desc: "Realtime rooms to share courses and ideas. Mention @ai for instant help." },
];

const STEPS = [
  { n: "01", title: "Describe it", desc: "Name a subject, level and audience. Or just chat with Vector." },
  { n: "02", title: "Vector builds it", desc: "Lesson notes, examples and activities written in minutes, in your language." },
  { n: "03", title: "Teach & share", desc: "Add slides, quizzes, assignments. Download or share with your team." },
];

const FAQ = [
  { q: "Which subjects does it support?", a: "Any subject and any level: school curricula, university topics, languages, professional skills, exam prep. Add a syllabus or exam board as the focus and Vector follows it." },
  { q: "Can I download the material?", a: "Yes. Full course books, quizzes (student copy and answer key) and assignments export to PDF and Word. Slide decks export to PowerPoint." },
  { q: "Which AI model powers it?", a: "Vector Academy runs on a modern large language model, using structured JSON output so every course, quiz and rubric follows a consistent format." },
  { q: "Can I create courses in other languages?", a: "Yes. Pick a language when you create the course and all learner-facing content is written in it. For non-Latin scripts, use Word export." },
  { q: "Should I review the content before teaching?", a: "Always. Vector produces a strong first draft quickly, but you're the expert. Review facts and adapt to your learners." },
];

export default function Landing() {
  return (
    <div className="force-light min-h-dvh overflow-x-hidden bg-white text-[#1c1917]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[#f2eeea] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#6b6460] md:flex">
            <a href="#features" className="hover:text-[#1c1917]">Features</a>
            <a href="#how" className="hover:text-[#1c1917]">How it works</a>
            <a href="#exports" className="hover:text-[#1c1917]">Exports</a>
            <a href="#faq" className="hover:text-[#1c1917]">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-[#1c1917] hover:bg-[#faf8f6] sm:block">
              Studio
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1c1917] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#292524]"
            >
              Open studio <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)] opacity-60" />
        <div className="pointer-events-none absolute top-[-200px] left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(234_88_12/0.18),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-10 text-center sm:px-6 sm:pt-14">
          <div className="mb-8 flex justify-center animate-fade-up">
            <Image
              src="/ict-division.png"
              alt="ICT Division, Government of Bangladesh — Future is here"
              width={1280}
              height={697}
              priority
              className="h-16 w-auto sm:h-20"
            />
          </div>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-full border border-[#ebe6e1] bg-white px-1.5 py-1 pr-3 text-xs font-medium text-[#6b6460] shadow-sm transition hover:border-[#ea580c]/40 animate-fade-up"
          >
            <span className="rounded-full bg-[#fff1e6] px-2 py-0.5 font-semibold text-[#ea580c]">New</span>
            AI assistant now builds slides, quizzes & assignments <ArrowRight className="size-3" />
          </Link>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-[44px] leading-[1.02] sm:text-7xl animate-fade-up" style={{ animationDelay: "60ms" }}>
            Build any course <br className="hidden sm:block" />
            in <span className="text-gradient">minutes, not weeks.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6b6460] animate-fade-up" style={{ animationDelay: "120ms" }}>
            Vector Academy is the AI course studio for tutors. Describe what you teach. Get full lesson notes, slide decks, MCQ quizzes
            and assignments, ready to download as PDF, Word or PowerPoint.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: "180ms" }}>
            <a
              href="#try"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#ea580c] px-6 text-[15px] font-semibold text-white shadow-[0_10px_30px_-10px_rgb(234_88_12/0.8)] transition hover:brightness-110"
            >
              <Wand2 className="size-4" /> Create your first course
            </a>
            <Link
              href="/chat"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#ebe6e1] bg-white px-6 text-[15px] font-semibold text-[#1c1917] shadow-sm transition hover:bg-[#faf8f6]"
            >
              <Sparkles className="size-4 text-[#ea580c]" /> Talk to the AI assistant
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#6b6460]">
            {["Any subject, any level", "10+ languages", "PDF · Word · PowerPoint"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-[#12a46f]" /> {t}
              </span>
            ))}
          </div>
          <div id="try" className="mt-12 scroll-mt-24 animate-fade-up" style={{ animationDelay: "220ms" }}>
            <LandingComposer />
          </div>
        </div>
      </section>

      {/* Subjects marquee */}
      <section className="border-y border-[#f2eeea] bg-[#fcfaf8] py-6">
        <p className="mb-4 text-center text-xs font-semibold tracking-[0.18em] text-[#a39e99] uppercase">Courses tutors build with Vector</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div className="marquee flex w-max gap-3">
            {[...SUBJECTS, ...SUBJECTS].map((s, i) => (
              <span key={i} className="rounded-full border border-[#ebe6e1] bg-white px-4 py-2 text-sm font-medium whitespace-nowrap text-[#1c1917]">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold text-[#ea580c]">Everything in one studio</div>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl">From blank page to teach-ready</h2>
          <p className="mt-4 text-[#6b6460]">One prompt gives you a whole course. Then add the materials you need, with one click each.</p>
        </div>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc, span }, i) => (
            <div
              key={title}
              className={`group relative overflow-hidden rounded-3xl border border-[#efebe7] bg-white p-7 shadow-[0_1px_2px_rgb(28_25_23/0.04)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgb(28_25_23/0.18)] ${span ?? ""}`}
            >
              <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-[#ea580c]/0 blur-3xl transition group-hover:bg-[#ea580c]/10" />
              <span
                className={`grid size-12 place-items-center rounded-2xl ${
                  ["bg-[#fff1e6] text-[#ea580c]", "bg-[#fff3e8] text-[#d9730d]", "bg-[#e6f7ef] text-[#12a46f]", "bg-[#fdeef5] text-[#d6336c]", "bg-[#fef3c7] text-[#b45309]"][i]
                }`}
              >
                <Icon className="size-6" />
              </span>
              <h3 className="mt-5 font-display text-xl">{title}</h3>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[#6b6460]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 bg-[#1c1917] py-24 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <div className="text-sm font-semibold text-[#fdba74]">How it works</div>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">Three steps. Zero blank pages.</h2>
              <p className="mt-4 max-w-md text-white/65">
                Spend your time teaching, not formatting. Vector handles structure, writing and layout. You stay in control of every word.
              </p>
              <Link
                href="/courses/new"
                className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-[#1c1917] transition hover:bg-white/90"
              >
                Start building <ArrowRight className="size-4" />
              </Link>
            </div>
            <ol className="space-y-4">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <span className="font-display text-3xl text-[#fb923c]">{s.n}</span>
                  <div>
                    <h3 className="font-display text-xl">{s.title}</h3>
                    <p className="mt-1 text-white/65">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Exports + audiences */}
      <section id="exports" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#efebe7] bg-gradient-to-br from-[#fff7f0] to-white p-8">
            <div className="text-sm font-semibold text-[#ea580c]">Export anywhere</div>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">Beautiful files, ready to print or share</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: FileText, f: "PDF", d: "Course books, quizzes, handouts", c: "text-[#e5484d] bg-[#fdeceb]" },
                { icon: FileType2, f: "Word", d: "Editable .docx documents", c: "text-[#ea580c] bg-[#fff1e6]" },
                { icon: Presentation, f: "PowerPoint", d: "Slide decks with notes", c: "text-[#d9730d] bg-[#fff3e8]" },
              ].map(({ icon: Icon, f, d, c }) => (
                <div key={f} className="rounded-2xl border border-[#efebe7] bg-white p-4">
                  <span className={`grid size-10 place-items-center rounded-xl ${c}`}>
                    <Icon className="size-5" />
                  </span>
                  <div className="mt-3 font-semibold">{f}</div>
                  <div className="mt-0.5 text-[13px] text-[#6b6460]">{d}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-[#efebe7] bg-white p-8">
            <div className="text-sm font-semibold text-[#ea580c]">Built for educators</div>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">Made for every kind of tutor</h2>
            <ul className="mt-8 space-y-4">
              {[
                { icon: GraduationCap, t: "Private tutors", d: "Personalised courses for each student, in minutes." },
                { icon: School, t: "Schools & coaching centres", d: "Shared library and group chat for whole departments." },
                { icon: Languages, t: "Language teachers", d: "Write courses in the language your learners speak." },
                { icon: Users, t: "Corporate trainers", d: "Professional skills courses with practical assignments." },
              ].map(({ icon: Icon, t, d }) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#faf8f6] text-[#1c1917]">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <div className="font-semibold">{t}</div>
                    <div className="text-[14px] text-[#6b6460]">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-24 sm:px-6">
        <h2 className="text-center font-display text-4xl sm:text-5xl">Questions, answered</h2>
        <div className="mt-10 divide-y divide-[#efebe7] rounded-3xl border border-[#efebe7] bg-white">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#faf8f6] text-lg leading-none text-[#6b6460] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-[#6b6460]">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-gradient-to-br from-[#ea580c] via-[#f2700f] to-[#f59e0b] px-6 py-16 text-center text-white sm:px-12">
          <div className="bg-dots pointer-events-none absolute inset-0 opacity-20 [filter:invert(1)]" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-4xl sm:text-5xl">Your next course is one sentence away.</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">Open the studio, describe a subject, and watch Vector build it.</p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-[15px] font-semibold text-[#1c1917] shadow-lg transition hover:bg-white/90"
            >
              Open the studio <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#f2eeea]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[#6b6460] sm:flex-row sm:px-6">
          <Logo />
          <div className="flex gap-6">
            <Link href="/dashboard" className="hover:text-[#1c1917]">Studio</Link>
            <Link href="/courses" className="hover:text-[#1c1917]">Library</Link>
            <Link href="/groups" className="hover:text-[#1c1917]">Group chat</Link>
          </div>
          <span>© {new Date().getFullYear()} Vector Academy · AI course studio for tutors</span>
        </div>
      </footer>
    </div>
  );
}
