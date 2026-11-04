"use client";

import type { SlideDeck } from "../schemas";
import { plain } from "./doc-model";
import { slugify } from "../utils";

export async function exportPptx(deck: SlideDeck, courseTitle: string, theme: { from: string; to: string }) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.title = deck.deckTitle;
  pptx.company = "Vector Academy";

  const A = theme.from.replace("#", "");
  const B = theme.to.replace("#", "");
  const INK = "17171C";
  const MUTED = "6B6B76";
  const FONT = "Calibri";

  pptx.defineSlideMaster({
    title: "CONTENT",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: A } } },
      { rect: { x: 0, y: 0.12, w: 13.33, h: 0.04, fill: { color: B } } },
      { text: { text: courseTitle, options: { x: 0.6, y: 6.95, w: 9, h: 0.35, fontSize: 10, color: MUTED, fontFace: FONT } } },
    ],
    slideNumber: { x: 12.3, y: 6.95, w: 0.5, h: 0.35, fontSize: 10, color: MUTED, fontFace: FONT },
  });

  const bulletOpts = { fontSize: 20, color: INK, fontFace: FONT, paraSpaceAfter: 10, bullet: { code: "25CF", indent: 22 }, valign: "top" as const };

  deck.slides.forEach((s, idx) => {
    const isHero = s.layout === "title" || (s.layout === "summary" && idx === deck.slides.length - 1 && !s.bullets.length);
    if (s.layout === "title" || s.layout === "quote") {
      const slide = pptx.addSlide();
      slide.background = { color: A };
      slide.addShape("ellipse", { x: 9.2, y: -1.6, w: 6, h: 6, fill: { color: B, transparency: 55 }, line: { color: B, transparency: 100 } });
      slide.addShape("ellipse", { x: 11, y: 4.8, w: 3.4, h: 3.4, fill: { color: "FFFFFF", transparency: 88 }, line: { color: "FFFFFF", transparency: 100 } });
      if (s.layout === "title") {
        slide.addText("VECTOR ACADEMY", { x: 0.8, y: 1.3, w: 8, h: 0.4, fontSize: 12, bold: true, color: "FFFFFF", charSpacing: 6, fontFace: FONT });
        slide.addText(plain(s.title), { x: 0.8, y: 1.9, w: 10.5, h: 2.4, fontSize: 48, bold: true, color: "FFFFFF", fontFace: FONT, valign: "top", fit: "shrink" });
        if (s.subtitle) slide.addText(plain(s.subtitle), { x: 0.8, y: 4.5, w: 10, h: 1, fontSize: 22, color: "F1ECFF", fontFace: FONT, valign: "top" });
      } else {
        slide.addText("“", { x: 0.7, y: 0.7, w: 2, h: 1.6, fontSize: 120, color: "FFFFFF", fontFace: "Georgia", transparency: 40 });
        slide.addText(plain(s.quote || s.title), { x: 1.2, y: 1.9, w: 10.8, h: 3.2, fontSize: 34, italic: true, color: "FFFFFF", fontFace: "Georgia", valign: "middle", fit: "shrink" });
        slide.addText(plain(s.subtitle || s.title), { x: 1.2, y: 5.4, w: 10, h: 0.6, fontSize: 16, color: "F1ECFF", fontFace: FONT });
      }
      if (s.speakerNotes) slide.addNotes(s.speakerNotes);
      return;
    }

    const slide = pptx.addSlide({ masterName: "CONTENT" });
    slide.addText(plain(s.title), { x: 0.6, y: 0.45, w: 12, h: 0.9, fontSize: 32, bold: true, color: INK, fontFace: FONT, fit: "shrink" });
    let top = 1.4;
    if (s.subtitle) {
      slide.addText(plain(s.subtitle), { x: 0.6, y: 1.25, w: 12, h: 0.5, fontSize: 16, color: MUTED, fontFace: FONT });
      top = 1.9;
    }

    if (s.layout === "two-column" && s.columns.length) {
      const cols = s.columns.slice(0, 2);
      cols.forEach((c, i) => {
        const x = 0.6 + i * 6.15;
        slide.addShape("roundRect", { x, y: top + 0.1, w: 5.9, h: 6.6 - top - 0.4, fill: { color: i === 0 ? "F5F3FF" : "FFF4EE" }, line: { color: i === 0 ? "E7E1FF" : "FFE4D6" }, rectRadius: 0.15 });
        slide.addText(plain(c.heading), { x: x + 0.3, y: top + 0.3, w: 5.3, h: 0.55, fontSize: 20, bold: true, color: i === 0 ? A : B, fontFace: FONT });
        slide.addText(
          c.bullets.map((t) => ({ text: plain(t), options: { ...bulletOpts, fontSize: 17 } })),
          { x: x + 0.3, y: top + 0.95, w: 5.3, h: 6.6 - top - 1.6, valign: "top", fit: "shrink" },
        );
      });
    } else {
      const summary = s.layout === "summary";
      if (summary) slide.addShape("roundRect", { x: 0.6, y: top + 0.1, w: 12.1, h: 6.6 - top - 0.4, fill: { color: "F7F7F5" }, line: { color: "ECECE7" }, rectRadius: 0.15 });
      slide.addText(
        s.bullets.map((t) => ({ text: plain(t), options: { ...bulletOpts, bullet: summary ? { code: "2714", indent: 26 } : bulletOpts.bullet } })),
        { x: summary ? 1 : 0.7, y: top + (summary ? 0.4 : 0.2), w: summary ? 11.3 : 11.8, h: 6.6 - top - (summary ? 1 : 0.6), valign: "top", fit: "shrink" },
      );
    }
    if (isHero) slide.background = { color: "FFFFFF" };
    if (s.speakerNotes) slide.addNotes(s.speakerNotes);
  });

  await pptx.writeFile({ fileName: `${slugify(deck.deckTitle)}.pptx` });
}
