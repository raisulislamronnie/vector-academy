"use client";

import type { DocModel, Run } from "./doc-model";
import { slugify } from "../utils";

export async function exportDocx(model: DocModel, accentHex = "#ea580c") {
  const D = await import("docx");
  const accent = accentHex.replace("#", "").toUpperCase();
  const FONT = "Calibri";

  const runs = (rs: Run[], extra: { color?: string; size?: number } = {}) =>
    rs.map(
      (r) =>
        new D.TextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
          font: r.code ? "Consolas" : undefined,
          color: r.code ? accent : extra.color,
          size: extra.size,
        }),
    );

  const children: (InstanceType<typeof D.Paragraph> | InstanceType<typeof D.Table>)[] = [];
  let numberedInstance = 0;

  const cellBorder = { style: D.BorderStyle.SINGLE, size: 4, color: "E2E2DE" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  for (const b of model.blocks) {
    switch (b.type) {
      case "cover":
        children.push(
          new D.Paragraph({
            spacing: { before: 2400, after: 200 },
            children: [new D.TextRun({ text: "VECTOR ACADEMY", bold: true, color: accent, size: 18, characterSpacing: 40 })],
          }),
          new D.Paragraph({
            heading: D.HeadingLevel.TITLE,
            spacing: { after: 200 },
            children: [new D.TextRun({ text: b.title, bold: true, size: 60, color: "18181E" })],
          }),
          new D.Paragraph({
            spacing: { after: 400 },
            children: [new D.TextRun({ text: b.subtitle, size: 28, color: "696976" })],
          }),
          new D.Paragraph({
            border: { top: { style: D.BorderStyle.SINGLE, size: 12, color: accent, space: 12 } },
            children: [new D.TextRun({ text: b.meta.join("   ·   "), size: 20, color: "696976" })],
          }),
          new D.Paragraph({ children: [new D.PageBreak()] }),
        );
        break;
      case "h1":
        children.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, children: [new D.TextRun(b.text)] }));
        break;
      case "h2":
        children.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, children: [new D.TextRun(b.text)] }));
        break;
      case "h3":
        children.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_3, children: [new D.TextRun(b.text)] }));
        break;
      case "p":
        children.push(new D.Paragraph({ spacing: { after: 140 }, children: runs(b.runs, { color: b.muted ? "696976" : undefined }) }));
        break;
      case "bullets":
        b.items.forEach((it) => children.push(new D.Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: runs(it) })));
        children.push(new D.Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      case "numbered": {
        const instance = numberedInstance++;
        b.items.forEach((it) =>
          children.push(
            new D.Paragraph({ numbering: { reference: "numbered", level: 0, instance }, spacing: { after: 60 }, children: runs(it) }),
          ),
        );
        children.push(new D.Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
      }
      case "quote":
        children.push(
          new D.Paragraph({
            indent: { left: 360 },
            spacing: { before: 120, after: 200 },
            shading: { type: D.ShadingType.CLEAR, fill: "F5F3FF", color: "auto" },
            border: { left: { style: D.BorderStyle.SINGLE, size: 18, color: accent, space: 10 } },
            children: runs(b.runs, { color: "3F3F4A" }),
          }),
        );
        break;
      case "code":
        b.text.split("\n").forEach((ln) =>
          children.push(
            new D.Paragraph({
              shading: { type: D.ShadingType.CLEAR, fill: "F5F5F2", color: "auto" },
              spacing: { after: 0 },
              children: [new D.TextRun({ text: ln || " ", font: "Consolas", size: 18 })],
            }),
          ),
        );
        children.push(new D.Paragraph({ children: [] }));
        break;
      case "table": {
        const widths = b.widths ?? b.header.map(() => 1 / b.header.length);
        const mkRow = (cells: string[], header: boolean) =>
          new D.TableRow({
            tableHeader: header,
            children: cells.map(
              (c, i) =>
                new D.TableCell({
                  borders,
                  width: { size: Math.round(widths[i] * 100), type: D.WidthType.PERCENTAGE },
                  shading: header ? { type: D.ShadingType.CLEAR, fill: "F4F3F0", color: "auto" } : undefined,
                  margins: { top: 80, bottom: 80, left: 100, right: 100 },
                  children: (c || " ").split("\n").map(
                    (ln) => new D.Paragraph({ children: [new D.TextRun({ text: ln, bold: header, size: 19 })] }),
                  ),
                }),
            ),
          });
        children.push(
          new D.Table({
            width: { size: 100, type: D.WidthType.PERCENTAGE },
            rows: [mkRow(b.header, true), ...b.rows.map((r) => mkRow(r, false))],
          }),
          new D.Paragraph({ children: [] }),
        );
        break;
      }
      case "option":
        children.push(
          new D.Paragraph({
            indent: { left: 360 },
            spacing: { after: 60 },
            children: [
              new D.TextRun({ text: `${b.label})  `, bold: true, color: b.correct ? "0F9D6B" : "696976" }),
              ...runs(b.runs, { color: b.correct ? "0F7855" : undefined }),
              ...(b.correct ? [new D.TextRun({ text: "  ✓", bold: true, color: "0F9D6B" })] : []),
            ],
          }),
        );
        break;
      case "pagebreak":
        children.push(new D.Paragraph({ children: [new D.PageBreak()] }));
        break;
      case "spacer":
        children.push(new D.Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
    }
  }

  const doc = new D.Document({
    creator: "Vector Academy",
    title: model.title,
    styles: {
      default: { document: { run: { font: { ascii: FONT, hAnsi: FONT, eastAsia: FONT, cs: "Nirmala UI" }, size: 22, sizeComplexScript: 22, color: "18181E" }, paragraph: { spacing: { line: 300 } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, color: accent }, paragraph: { spacing: { before: 360, after: 160 } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: "18181E" }, paragraph: { spacing: { before: 280, after: 120 } } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, color: "2A2A33" }, paragraph: { spacing: { before: 200, after: 80 } } },
      ],
    },
    numbering: {
      config: [
        {
          reference: "numbered",
          levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: "%1.", alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } } },
        footers: {
          default: new D.Footer({
            children: [
              new D.Paragraph({
                alignment: D.AlignmentType.RIGHT,
                children: [
                  new D.TextRun({ text: `${model.title}  ·  `, size: 16, color: "9A9AA4" }),
                  new D.TextRun({ children: [D.PageNumber.CURRENT], size: 16, color: "9A9AA4" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await D.Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(model.title)}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
