"use client";

import type { Block, DocModel, Run } from "./doc-model";

/** Bengali, Devanagari, Arabic and other scripts that need text shaping jsPDF can't do. */
export const NEEDS_SHAPING = /[֐-ࣿऀ-෿฀-࿿]/;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const runs = (rs: Run[]) =>
  rs
    .map((r) => {
      let h = esc(r.text);
      if (r.code) h = `<code>${h}</code>`;
      if (r.bold) h = `<strong>${h}</strong>`;
      if (r.italic) h = `<em>${h}</em>`;
      return h;
    })
    .join("");

function block(b: Block): string {
  switch (b.type) {
    case "cover":
      return `<section class="cover"><div class="brand">VECTOR ACADEMY</div><h1>${esc(b.title)}</h1><p class="sub">${esc(b.subtitle)}</p><p class="meta">${b.meta.map(esc).join(" &nbsp;·&nbsp; ")}</p></section>`;
    case "h1":
    case "h2":
    case "h3":
      return `<${b.type}>${esc(b.text)}</${b.type}>`;
    case "p":
      return `<p${b.muted ? ' class="muted"' : ""}>${runs(b.runs)}</p>`;
    case "bullets":
      return `<ul>${b.items.map((i) => `<li>${runs(i)}</li>`).join("")}</ul>`;
    case "numbered":
      return `<ol>${b.items.map((i) => `<li>${runs(i)}</li>`).join("")}</ol>`;
    case "quote":
      return `<blockquote>${runs(b.runs)}</blockquote>`;
    case "code":
      return `<pre>${esc(b.text)}</pre>`;
    case "table":
      return `<table><thead><tr>${b.header.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c).replace(/\n/g, "<br>")}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
    case "option":
      return `<p class="opt${b.correct ? " ok" : ""}"><b>${esc(b.label)})</b> ${runs(b.runs)}${b.correct ? " ✓" : ""}</p>`;
    case "pagebreak":
      return `<div class="pb"></div>`;
    case "spacer":
      return `<div style="height:10px"></div>`;
  }
}

/**
 * Renders the document as HTML and opens the browser's print dialog ("Save as PDF").
 * The browser shapes Bangla and other complex scripts correctly, which jsPDF cannot.
 */
export async function printPdf(model: DocModel, accent = "#ea580c") {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(model.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=block" rel="stylesheet">
<style>
@page { size: A4; margin: 18mm 16mm; }
body { font-family: "Noto Sans", "Hind Siliguri", "Nirmala UI", "Vrinda", sans-serif; color: #1c1917; font-size: 11pt; line-height: 1.6; }
h1 { font-size: 20pt; color: ${accent}; margin: 18pt 0 8pt; } h2 { font-size: 15pt; margin: 14pt 0 6pt; } h3 { font-size: 12.5pt; margin: 10pt 0 4pt; }
h1, h2, h3 { break-after: avoid; } p, li, tr { break-inside: avoid; }
.cover { height: 240mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
.cover .brand { color: ${accent}; font-weight: 700; letter-spacing: .3em; font-size: 9pt; }
.cover h1 { font-size: 30pt; color: #1c1917; margin: 8pt 0; } .cover .sub { font-size: 14pt; color: #6b6460; }
.cover .meta { border-top: 2px solid ${accent}; padding-top: 8pt; color: #6b6460; font-size: 10pt; }
.muted { color: #6b6460; } blockquote { margin: 8pt 0; padding: 6pt 10pt; border-left: 3px solid ${accent}; background: #fff7ed; }
pre, code { font-family: Consolas, monospace; font-size: 9.5pt; } pre { background: #f5f5f2; padding: 8pt; white-space: pre-wrap; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 9.5pt; } th, td { border: 1px solid #e2e2de; padding: 5pt; text-align: left; vertical-align: top; } th { background: #f4f3f0; }
.opt { margin: 2pt 0 2pt 14pt; } .opt.ok { color: #0f7855; } .pb { break-after: page; }
</style></head><body>${model.blocks.map(block).join("")}</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const win = frame.contentWindow!;
  win.document.open();
  win.document.write(html);
  win.document.close();
  await new Promise<void>((resolve) => (win.document.readyState === "complete" ? resolve() : win.addEventListener("load", () => resolve(), { once: true })));
  // Wait for the Bangla web font (bounded, so an offline machine still prints with system fonts).
  await Promise.race([win.document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]);
  win.focus();
  win.print();
  setTimeout(() => frame.remove(), 60_000);
}
