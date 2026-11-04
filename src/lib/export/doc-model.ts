import type { AssignmentSet, Course, Quiz, SlideDeck } from "../schemas";

/** Format-neutral document model rendered by both the PDF and DOCX exporters. */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}
export type Block =
  | { type: "cover"; title: string; subtitle: string; meta: string[] }
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; runs: Run[]; muted?: boolean }
  | { type: "bullets" | "numbered"; items: Run[][] }
  | { type: "quote"; runs: Run[] }
  | { type: "code"; text: string }
  | { type: "table"; header: string[]; rows: string[][]; widths?: number[] }
  | { type: "option"; label: string; runs: Run[]; correct?: boolean }
  | { type: "pagebreak" }
  | { type: "spacer" };

/** Minimal context for exports: a Course, or a standalone resource's topic/audience. */
export interface DocMeta {
  title: string;
  level: string;
}

export interface DocModel {
  title: string;
  blocks: Block[];
}

/* ---------- Markdown → blocks (headings, lists, quotes, code, tables, paragraphs) ---------- */

export function parseInline(text: string): Run[] {
  const runs: Run[] = [];
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_|`([^`]+)`|\[([^\]]+)\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    if (m[2] ?? m[3]) runs.push({ text: (m[2] ?? m[3])!, bold: true });
    else if (m[4] ?? m[5]) runs.push({ text: (m[4] ?? m[5])!, italic: true });
    else if (m[6]) runs.push({ text: m[6], code: true });
    else if (m[7]) runs.push({ text: m[7] });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length ? runs : [{ text: "" }];
}

export function plain(text: string) {
  return parseInline(text)
    .map((r) => r.text)
    .join("");
}

export function markdownToBlocks(md: string, headingOffset = 0): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  let list: { type: "bullets" | "numbered"; items: Run[][] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: "p", runs: parseInline(para.join(" ")) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (t.startsWith("```")) {
      flushPara();
      flushList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    if (!t) {
      flushPara();
      flushList();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(t);
    if (h) {
      flushPara();
      flushList();
      const level = Math.min(3, h[1].length + headingOffset);
      blocks.push({ type: (["h1", "h2", "h3"] as const)[Math.max(0, level - 1)], text: plain(h[2]) });
      continue;
    }
    if (/^\|.*\|$/.test(t) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      flushPara();
      flushList();
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => plain(c.trim()));
      const header = cells(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) rows.push(cells(lines[i++]));
      i--;
      blocks.push({ type: "table", header, rows });
      continue;
    }
    const bullet = /^[-*+]\s+(.*)$/.exec(t);
    const num = /^\d+[.)]\s+(.*)$/.exec(t);
    if (bullet || num) {
      flushPara();
      const type = bullet ? "bullets" : "numbered";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(parseInline((bullet ?? num)![1]));
      continue;
    }
    if (t.startsWith(">")) {
      flushPara();
      flushList();
      blocks.push({ type: "quote", runs: parseInline(t.replace(/^>\s?/, "")) });
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(t)) {
      flushPara();
      flushList();
      continue;
    }
    if (list && /^\s{2,}/.test(line)) {
      const items: Run[][] = (list as { items: Run[][] }).items;
      items[items.length - 1].push({ text: " " + t });
      continue;
    }
    flushList();
    para.push(t);
  }
  flushPara();
  flushList();
  return blocks;
}

const r = (text: string): Run[] => [{ text }];
const LETTERS = "ABCDEFGH";

/* Fixed document labels follow the content's language: Bangla content gets Bangla headings. */
const DOC_BN: Record<string, string> = {
  "Prepared by {s}": "প্রস্তুতকারী: {s}",
  "Course overview": "কোর্সের সারসংক্ষেপ",
  "Learning objectives": "শিখন উদ্দেশ্য",
  Prerequisites: "পূর্বশর্ত",
  "Course outline": "কোর্সের রূপরেখা",
  Module: "মডিউল",
  Lessons: "লেসন",
  "Module {n}: {s}": "মডিউল {n}: {s}",
  "Lesson {n} — {s}": "লেসন {n} — {s}",
  "Duration: {n} min": "সময়: {n} মিনিট",
  "Key takeaways": "মূল শিক্ষা",
  "Activity: ": "কার্যক্রম: ",
  Glossary: "শব্দকোষ",
  Term: "শব্দ",
  Definition: "সংজ্ঞা",
  "Recommended resources": "প্রস্তাবিত রিসোর্স",
  "{n} questions": "{n}টি প্রশ্ন",
  "Answer key edition": "উত্তরমালা সংস্করণ",
  "Student edition": "শিক্ষার্থী সংস্করণ",
  "Name: ______________________    Date: ____________    Score: ______ / {n}": "নাম: ______________________    তারিখ: ____________    প্রাপ্ত নম্বর: ______ / {n}",
  "Answer: {s}. ": "উত্তর: {s}। ",
  "Answer key": "উত্তরমালা",
  Q: "প্রশ্ন",
  Answer: "উত্তর",
  Assignments: "অ্যাসাইনমেন্ট",
  "{n} assignments": "{n}টি অ্যাসাইনমেন্ট",
  "{n} assignment": "{n}টি অ্যাসাইনমেন্ট",
  "Assignment {n}: {s}": "অ্যাসাইনমেন্ট {n}: {s}",
  "{n} hours": "{n} ঘণ্টা",
  Instructions: "নির্দেশনা",
  Deliverables: "জমা দেওয়ার বিষয়",
  "Grading rubric": "মূল্যায়ন রুব্রিক",
  Criterion: "মানদণ্ড",
  Weight: "নম্বরের ভার",
  Excellent: "চমৎকার",
  Satisfactory: "সন্তোষজনক",
  "Needs improvement": "উন্নতি প্রয়োজন",
  "{s} — Assignments": "{s} — অ্যাসাইনমেন্ট",
  "{n} slides": "{n}টি স্লাইড",
  "Handout with speaker notes": "বক্তার নোটসহ হ্যান্ডআউট",
  "Slide {n} — {s}": "স্লাইড {n} — {s}",
  "Notes: ": "নোট: ",
  Beginner: "প্রাথমিক",
  Intermediate: "মধ্যম",
  Advanced: "উচ্চতর",
  Expert: "বিশেষজ্ঞ",
  easy: "সহজ",
  medium: "মাঝারি",
  hard: "কঠিন",
};

/** Returns a label function: Bangla when the content itself is Bangla, English otherwise. */
function labelsFor(...content: unknown[]) {
  const bn = /[\u0980-\u09FF]/.test(JSON.stringify(content));
  return (s: string, vars: Record<string, string | number> = {}) => {
    let out = bn ? (DOC_BN[s] ?? s) : s;
    for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
    return out;
  };
}

/* ---------- Builders ---------- */

export function courseDoc(c: Course): DocModel {
  const L = labelsFor(c.title, c.description);
  const b: Block[] = [
    {
      type: "cover",
      title: c.title,
      subtitle: c.subtitle,
      meta: [L(c.level), c.audience, c.duration, L("Prepared by {s}", { s: c.author })].filter(Boolean),
    },
    { type: "h1", text: L("Course overview") },
    ...markdownToBlocks(c.description),
    { type: "h2", text: L("Learning objectives") },
    { type: "numbered", items: c.objectives.map(r) },
  ];
  if (c.prerequisites.length) b.push({ type: "h2", text: L("Prerequisites") }, { type: "bullets", items: c.prerequisites.map(r) });
  b.push(
    { type: "h2", text: L("Course outline") },
    {
      type: "table",
      header: [L("Module"), L("Lessons")],
      rows: c.modules.map((m, i) => [`${i + 1}. ${m.title}`, m.lessons.map((l) => l.title).join("\n")]),
      widths: [0.4, 0.6],
    },
  );
  c.modules.forEach((m, mi) => {
    b.push({ type: "pagebreak" }, { type: "h1", text: L("Module {n}: {s}", { n: mi + 1, s: m.title }) }, { type: "p", runs: parseInline(m.overview), muted: true });
    m.lessons.forEach((l, li) => {
      b.push(
        { type: "h2", text: L("Lesson {n} — {s}", { n: `${mi + 1}.${li + 1}`, s: l.title }) },
        { type: "p", runs: [{ text: L("Duration: {n} min", { n: l.durationMinutes }), italic: true }], muted: true },
        ...markdownToBlocks(l.content, 2),
        { type: "h3", text: L("Key takeaways") },
        { type: "bullets", items: l.keyTakeaways.map(parseInline) },
        { type: "quote", runs: [{ text: L("Activity: "), bold: true }, ...parseInline(l.activity)] },
      );
    });
  });
  if (c.glossary.length) {
    b.push(
      { type: "pagebreak" },
      { type: "h1", text: L("Glossary") },
      { type: "table", header: [L("Term"), L("Definition")], rows: c.glossary.map((g) => [g.term, g.definition]), widths: [0.3, 0.7] },
    );
  }
  if (c.resources.length) {
    b.push(
      { type: "h1", text: L("Recommended resources") },
      {
        type: "bullets",
        items: c.resources.map((x) => [{ text: x.title, bold: true }, { text: ` (${x.type}) — ${x.description}` }]),
      },
    );
  }
  return { title: c.title, blocks: b };
}

export function quizDoc(c: DocMeta, quiz: Quiz, withAnswers: boolean): DocModel {
  const L = labelsFor(quiz.title, quiz.questions[0]);
  const b: Block[] = [
    {
      type: "cover",
      title: quiz.title,
      subtitle: c.title,
      meta: [L("{n} questions", { n: quiz.questions.length }), c.level, L(withAnswers ? "Answer key edition" : "Student edition")],
    },
    { type: "p", runs: parseInline(quiz.instructions), muted: true },
  ];
  if (!withAnswers) b.push({ type: "p", runs: r(L("Name: ______________________    Date: ____________    Score: ______ / {n}", { n: quiz.questions.length })) });
  quiz.questions.forEach((q, i) => {
    b.push({ type: "h3", text: `${i + 1}. ${plain(q.question)}` });
    q.options.forEach((o, oi) =>
      b.push({ type: "option", label: LETTERS[oi], runs: parseInline(o), correct: withAnswers && oi === q.correctIndex }),
    );
    if (withAnswers) {
      b.push({
        type: "quote",
        runs: [
          { text: L("Answer: {s}. ", { s: LETTERS[q.correctIndex] }), bold: true },
          ...parseInline(q.explanation),
          { text: `  [${L(q.difficulty)} · ${q.topic}]`, italic: true },
        ],
      });
    }
    b.push({ type: "spacer" });
  });
  if (!withAnswers) {
    b.push(
      { type: "pagebreak" },
      { type: "h2", text: L("Answer key") },
      {
        type: "table",
        header: [L("Q"), L("Answer"), L("Q"), L("Answer")],
        rows: chunkPairs(quiz.questions.map((q, i) => [`${i + 1}`, LETTERS[q.correctIndex]])),
      },
    );
  }
  return { title: quiz.title, blocks: b };
}

function chunkPairs(items: string[][]): string[][] {
  const half = Math.ceil(items.length / 2);
  return Array.from({ length: half }, (_, i) => [...items[i], ...(items[i + half] ?? ["", ""])]);
}

export function assignmentsDoc(c: DocMeta, set: AssignmentSet): DocModel {
  const L = labelsFor(set.assignments[0]);
  const b: Block[] = [
    {
      type: "cover",
      title: L("Assignments"),
      subtitle: c.title,
      meta: [L(set.assignments.length > 1 ? "{n} assignments" : "{n} assignment", { n: set.assignments.length }), c.level],
    },
  ];
  set.assignments.forEach((a, i) => {
    if (i > 0) b.push({ type: "pagebreak" });
    b.push(
      { type: "h1", text: L("Assignment {n}: {s}", { n: i + 1, s: a.title }) },
      {
        type: "p",
        runs: [{ text: `${a.type.replace("-", " ")} · ~${L("{n} hours", { n: a.estimatedHours })} · ${a.dueGuidance}`, italic: true }],
        muted: true,
      },
      ...markdownToBlocks(a.overview),
      { type: "h2", text: L("Learning objectives") },
      { type: "bullets", items: a.objectives.map(parseInline) },
      { type: "h2", text: L("Instructions") },
      { type: "numbered", items: a.instructions.map(parseInline) },
      { type: "h2", text: L("Deliverables") },
      { type: "bullets", items: a.deliverables.map(parseInline) },
      { type: "h2", text: L("Grading rubric") },
      {
        type: "table",
        header: [L("Criterion"), L("Weight"), L("Excellent"), L("Satisfactory"), L("Needs improvement")],
        rows: a.rubric.map((x) => [x.criterion, `${x.weight}%`, x.excellent, x.satisfactory, x.needsImprovement]),
        widths: [0.18, 0.1, 0.24, 0.24, 0.24],
      },
    );
  });
  return { title: L("{s} — Assignments", { s: c.title }), blocks: b };
}

export function slidesDoc(c: DocMeta, deck: SlideDeck): DocModel {
  const L = labelsFor(deck.deckTitle, deck.slides[0]);
  const b: Block[] = [
    { type: "cover", title: deck.deckTitle, subtitle: c.title, meta: [L("{n} slides", { n: deck.slides.length }), L("Handout with speaker notes")] },
  ];
  deck.slides.forEach((s, i) => {
    b.push({ type: "h2", text: L("Slide {n} — {s}", { n: i + 1, s: s.title }) });
    if (s.subtitle) b.push({ type: "p", runs: [{ text: s.subtitle, italic: true }], muted: true });
    if (s.quote) b.push({ type: "quote", runs: parseInline(s.quote) });
    if (s.bullets.length) b.push({ type: "bullets", items: s.bullets.map(parseInline) });
    s.columns.forEach((col) => b.push({ type: "h3", text: col.heading }, { type: "bullets", items: col.bullets.map(parseInline) }));
    if (s.speakerNotes) b.push({ type: "p", runs: [{ text: L("Notes: "), bold: true }, ...parseInline(s.speakerNotes)], muted: true });
  });
  return { title: deck.deckTitle, blocks: b };
}
