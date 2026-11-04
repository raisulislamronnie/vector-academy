"use client";

import type { jsPDF as JsPDF } from "jspdf";
import type { Block, DocModel, Run } from "./doc-model";
import { slugify } from "../utils";

/* Standard PDF fonts only cover WinAnsi; map common symbols so they don't garble. */
const SYMBOLS: Record<string, string> = {
  "→": "->", "←": "<-", "↔": "<->", "⇒": "=>", "≤": "<=", "≥": ">=", "≠": "!=", "≈": "~", "−": "-", "×": "x", "÷": "/",
  "√": "sqrt", "∞": "infinity", "∑": "Sum", "∆": "Delta", "Δ": "Delta", "α": "alpha", "β": "beta", "γ": "gamma",
  "δ": "delta", "ε": "epsilon", "θ": "theta", "λ": "lambda", "μ": "mu", "π": "pi", "σ": "sigma", "Σ": "Sigma",
  "τ": "tau", "φ": "phi", "ω": "omega", "Ω": "Omega", "∈": "in", "∀": "for all", "∃": "exists", "✓": "v", "✔": "v",
  "★": "*", "☆": "*", " ": " ", "⁄": "/", "′": "'", "″": '"',
};
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
function clean(s: string) {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code < 256 || WINANSI_EXTRA.includes(ch)) out += ch;
    else if (SYMBOLS[ch]) out += SYMBOLS[ch];
    else if (code >= 0x2080 && code <= 0x2089) out += String(code - 0x2080); // subscript digits
    else if (code >= 0x2070 && code <= 0x2079) out += `^${code - 0x2070}`; // superscript digits
    else if (code >= 0x1f000) continue; // emoji
    else out += "?";
  }
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const INK: [number, number, number] = [24, 24, 30];
const MUTED: [number, number, number] = [105, 105, 118];
const LINE: [number, number, number] = [226, 226, 222];

class Writer {
  y: number;
  readonly W: number;
  readonly H: number;
  readonly M = 56;
  readonly CW: number;
  constructor(public doc: JsPDF, public accent: [number, number, number]) {
    this.W = doc.internal.pageSize.getWidth();
    this.H = doc.internal.pageSize.getHeight();
    this.CW = this.W - this.M * 2;
    this.y = this.M;
  }
  ensure(h: number) {
    if (this.y + h > this.H - this.M - 16) this.newPage();
  }
  newPage() {
    this.doc.addPage();
    this.y = this.M;
  }

  font(run: Run, size: number) {
    const style = run.bold && run.italic ? "bolditalic" : run.bold ? "bold" : run.italic ? "italic" : "normal";
    this.doc.setFont(run.code ? "courier" : "helvetica", run.code ? (run.bold ? "bold" : "normal") : style);
    this.doc.setFontSize(size);
  }

  /** Lays out mixed-style runs with word wrapping. */
  runs(runs: Run[], opts: { size?: number; x?: number; width?: number; color?: [number, number, number]; lh?: number } = {}) {
    const size = opts.size ?? 10.5;
    const x0 = opts.x ?? this.M;
    const width = opts.width ?? this.CW - (x0 - this.M);
    const lh = size * (opts.lh ?? 1.5);
    const color = opts.color ?? INK;

    type Tok = { run: Run; text: string; w: number; space: boolean };
    const toks: Tok[] = [];
    for (const run of runs) {
      for (const part of clean(run.text).split(/(\s+)/)) {
        if (!part) continue;
        const space = /^\s+$/.test(part);
        this.font(run, size);
        toks.push({ run, text: space ? " " : part, w: this.doc.getTextWidth(space ? " " : part), space });
      }
    }
    const lines: Tok[][] = [];
    let line: Tok[] = [];
    let lw = 0;
    for (const t of toks) {
      if (t.space && line.length === 0) continue;
      if (!t.space && lw + t.w > width && line.length) {
        while (line.length && line[line.length - 1].space) line.pop();
        lines.push(line);
        line = [];
        lw = 0;
      }
      if (!t.space && t.w > width) {
        // Hard-break very long tokens (URLs, formulas)
        this.font(t.run, size);
        for (const piece of this.doc.splitTextToSize(t.text, width) as string[]) {
          lines.push([{ ...t, text: piece, w: this.doc.getTextWidth(piece) }]);
        }
        continue;
      }
      line.push(t);
      lw += t.w;
    }
    if (line.length) lines.push(line);

    for (const ln of lines) {
      this.ensure(lh);
      let x = x0;
      for (const t of ln) {
        this.font(t.run, size);
        this.doc.setTextColor(...(t.run.code ? this.accent : color));
        this.doc.text(t.text, x, this.y + size);
        x += t.w;
      }
      this.y += lh;
    }
  }

  heading(text: string, level: 1 | 2 | 3) {
    const size = level === 1 ? 19 : level === 2 ? 14 : 11.5;
    const before = level === 1 ? 10 : level === 2 ? 14 : 10;
    this.y += before;
    this.ensure(size * 2.6);
    if (level === 1) {
      this.doc.setFillColor(...this.accent);
      this.doc.roundedRect(this.M, this.y + 2, 4, size + 2, 2, 2, "F");
      this.runs([{ text, bold: true }], { size, x: this.M + 14, lh: 1.3 });
    } else {
      this.runs([{ text, bold: true }], { size, lh: 1.35, color: level === 3 ? INK : INK });
    }
    this.y += level === 1 ? 6 : 3;
  }

  table(header: string[], rows: string[][], widths?: number[]) {
    const d = this.doc;
    const size = 8.8;
    const pad = 6;
    const lh = size * 1.4;
    const ws = (widths ?? header.map(() => 1 / header.length)).map((f) => f * this.CW);
    const measure = (cells: string[], bold: boolean) => {
      d.setFont("helvetica", bold ? "bold" : "normal");
      d.setFontSize(size);
      const split = cells.map((c, i) => d.splitTextToSize(clean(c ?? ""), ws[i] - pad * 2) as string[]);
      return { split, h: Math.max(...split.map((s) => s.length)) * lh + pad * 2 };
    };
    const drawRow = (cells: string[], bold: boolean, fill?: [number, number, number]) => {
      const { split, h } = measure(cells, bold);
      if (this.y + h > this.H - this.M - 16) {
        this.newPage();
        if (!bold) drawRow(header, true, [244, 243, 240]);
      }
      let x = this.M;
      split.forEach((lines, i) => {
        if (fill) {
          d.setFillColor(...fill);
          d.rect(x, this.y, ws[i], h, "F");
        }
        d.setDrawColor(...LINE);
        d.setLineWidth(0.6);
        d.rect(x, this.y, ws[i], h, "S");
        d.setFont("helvetica", bold ? "bold" : "normal");
        d.setFontSize(size);
        d.setTextColor(...(bold ? INK : ([55, 55, 64] as [number, number, number])));
        lines.forEach((ln, li) => d.text(ln, x + pad, this.y + pad + size + li * lh));
        x += ws[i];
      });
      this.y += h;
    };
    this.y += 4;
    drawRow(header, true, [244, 243, 240]);
    rows.forEach((r) => drawRow(r, false));
    this.y += 10;
  }

  cover(b: Extract<Block, { type: "cover" }>) {
    const d = this.doc;
    const h = 250;
    d.setFillColor(...this.accent);
    d.rect(0, 0, this.W, h, "F");
    d.setFillColor(255, 255, 255);
    d.setGState(d.GState({ opacity: 0.08 }));
    d.circle(this.W - 60, 40, 140, "F");
    d.circle(this.W - 10, h - 10, 70, "F");
    d.setGState(d.GState({ opacity: 1 }));
    d.setTextColor(255, 255, 255);
    d.setFont("helvetica", "bold");
    d.setFontSize(9);
    d.text("VECTOR ACADEMY", this.M, 64, { charSpace: 2 });
    d.setFontSize(26);
    const title = d.splitTextToSize(clean(b.title), this.CW - 40) as string[];
    title.slice(0, 3).forEach((ln, i) => d.text(ln, this.M, 112 + i * 32));
    d.setFont("helvetica", "normal");
    d.setFontSize(12);
    const sub = d.splitTextToSize(clean(b.subtitle), this.CW - 40) as string[];
    sub.slice(0, 2).forEach((ln, i) => d.text(ln, this.M, 120 + Math.min(3, title.length) * 32 + i * 16));
    this.y = h + 26;
    let x = this.M;
    d.setFontSize(8.5);
    for (const m of b.meta) {
      const t = clean(m);
      const w = d.getTextWidth(t) + 16;
      if (x + w > this.W - this.M) {
        x = this.M;
        this.y += 24;
      }
      d.setFillColor(244, 243, 240);
      d.roundedRect(x, this.y, w, 18, 9, 9, "F");
      d.setTextColor(...MUTED);
      d.text(t, x + 8, this.y + 12.2);
      x += w + 6;
    }
    this.y += 40;
  }

  block(b: Block) {
    const d = this.doc;
    switch (b.type) {
      case "cover":
        return this.cover(b);
      case "h1":
        return this.heading(b.text, 1);
      case "h2":
        return this.heading(b.text, 2);
      case "h3":
        return this.heading(b.text, 3);
      case "p":
        this.runs(b.runs, { color: b.muted ? MUTED : INK });
        this.y += 6;
        return;
      case "bullets":
      case "numbered":
        b.items.forEach((item, i) => {
          this.ensure(16);
          d.setFont("helvetica", "bold");
          d.setFontSize(10.5);
          d.setTextColor(...this.accent);
          d.text(b.type === "bullets" ? "•" : `${i + 1}.`, this.M + 6, this.y + 10.5);
          this.runs(item, { x: this.M + 22 });
          this.y += 2;
        });
        this.y += 6;
        return;
      case "quote": {
        const start = this.y;
        this.y += 6;
        const page = d.getNumberOfPages();
        this.runs(b.runs, { x: this.M + 16, color: [70, 70, 80] });
        this.y += 6;
        if (d.getNumberOfPages() === page) {
          d.setFillColor(...this.accent);
          d.rect(this.M + 2, start + 2, 2.5, this.y - start - 4, "F");
        }
        this.y += 6;
        return;
      }
      case "code": {
        d.setFont("courier", "normal");
        d.setFontSize(9);
        const lines = d.splitTextToSize(clean(b.text), this.CW - 20) as string[];
        const lh = 12.5;
        let i = 0;
        while (i < lines.length) {
          this.ensure(lh + 16);
          const fit = Math.max(1, Math.floor((this.H - this.M - 16 - this.y - 16) / lh));
          const chunk = lines.slice(i, i + fit);
          const h = chunk.length * lh + 16;
          d.setFillColor(245, 245, 242);
          d.roundedRect(this.M, this.y, this.CW, h, 6, 6, "F");
          d.setTextColor(50, 50, 60);
          d.setFont("courier", "normal");
          d.setFontSize(9);
          chunk.forEach((ln, li) => d.text(ln, this.M + 10, this.y + 8 + 9 + li * lh));
          this.y += h + 4;
          i += chunk.length;
          if (i < lines.length) this.newPage();
        }
        this.y += 6;
        return;
      }
      case "table":
        return this.table(b.header, b.rows, b.widths);
      case "option": {
        this.ensure(20);
        const cy = this.y + 8;
        if (b.correct) {
          d.setFillColor(15, 157, 107);
          d.circle(this.M + 16, cy, 8, "F");
          d.setTextColor(255, 255, 255);
        } else {
          d.setDrawColor(200, 200, 194);
          d.setLineWidth(0.8);
          d.circle(this.M + 16, cy, 8, "S");
          d.setTextColor(...MUTED);
        }
        d.setFont("helvetica", "bold");
        d.setFontSize(8.5);
        d.text(b.label, this.M + 16, cy + 3, { align: "center" });
        this.y += 0.5;
        this.runs(b.runs, { x: this.M + 32, color: b.correct ? [15, 120, 85] : INK });
        this.y += 3;
        return;
      }
      case "pagebreak":
        if (this.y > this.M + 4) this.newPage();
        return;
      case "spacer":
        this.y += 8;
        return;
    }
  }
}

export async function exportPdf(model: DocModel, accentHex = "#ea580c") {
  // jsPDF's built-in fonts can't draw Bangla; let the browser render and save it instead.
  const { NEEDS_SHAPING, printPdf } = await import("./print");
  if (NEEDS_SHAPING.test(JSON.stringify(model))) return printPdf(model, accentHex);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.setProperties({ title: model.title, creator: "Vector Academy" });
  const w = new Writer(doc, hexToRgb(accentHex));
  for (const b of model.blocks) w.block(b);

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    if (p === 1 && model.blocks[0]?.type === "cover") continue;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(w.M, w.H - 36, w.W - w.M, w.H - 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(clean(model.title).slice(0, 90), w.M, w.H - 22);
    doc.text(`${p} / ${total}`, w.W - w.M, w.H - 22, { align: "right" });
  }
  doc.save(`${slugify(model.title)}.pdf`);
}
