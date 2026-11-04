"use client";

import { Clock, Package, Target } from "lucide-react";
import { Badge } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { assignmentsDoc } from "@/lib/export/doc-model";
import { useI18n } from "@/lib/i18n";
import type { Course } from "@/lib/schemas";
import { courseTheme } from "@/lib/utils";
import { ExportMenu } from "./ExportMenu";
import { MaterialGenerator } from "./MaterialGenerator";

export function AssignmentsTab({ course, onUpdate }: { course: Course; onUpdate: (c: Course) => void }) {
  const set = course.assignments;
  const { t } = useI18n();
  const theme = courseTheme(course.subject);
  if (!set) return <MaterialGenerator course={course} kind="assignments" onDone={onUpdate} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("Assignments")}</h2>
          <p className="text-sm text-muted">{t("{n} student-ready briefs with grading rubrics", { n: set.assignments.length })}</p>
        </div>
        <ExportMenu
          accent={theme.from}
          options={[
            { label: t("All assignments"), format: "pdf", build: () => assignmentsDoc(course, set) },
            { label: t("All assignments"), format: "docx", build: () => assignmentsDoc(course, set) },
          ]}
        />
      </div>

      {set.assignments.map((a, i) => (
        <article key={i} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
          <header className="border-b border-border p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{t("Assignment {n}", { n: i + 1 })}</Badge>
              <Badge>{t(a.type.replace("-", " "))}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-subtle">
                <Clock className="size-3.5" /> ~{t("{n}h", { n: a.estimatedHours })} · {a.dueGuidance}
              </span>
            </div>
            <h3 className="mt-3 text-xl font-semibold tracking-tight">{a.title}</h3>
            <Markdown className="mt-2 text-muted">{a.overview}</Markdown>
          </header>
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_300px]">
            <div>
              <h4 className="mb-3 text-sm font-semibold">{t("Instructions")}</h4>
              <ol className="space-y-2.5">
                {a.instructions.map((s, j) => (
                  <li key={j} className="flex gap-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">{t("{n}", { n: j + 1 })}</span>
                    <span className="pt-0.5 leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-5">
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Target className="size-4 text-accent" /> {t("Objectives")}
                </h4>
                <ul className="space-y-1.5 text-sm text-muted">
                  {a.objectives.map((o, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-subtle" /> {o}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Package className="size-4 text-accent" /> {t("Deliverables")}
                </h4>
                <ul className="space-y-1.5 text-sm text-muted">
                  {a.deliverables.map((o, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-subtle" /> {o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-border p-5 sm:p-6">
            <h4 className="mb-3 text-sm font-semibold">{t("Grading rubric")}</h4>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="bg-surface-2 text-xs text-muted">
                  <tr>
                    <th className="p-3 font-semibold">{t("Criterion")}</th>
                    <th className="p-3 font-semibold">{t("Weight")}</th>
                    <th className="p-3 font-semibold text-success">{t("Excellent")}</th>
                    <th className="p-3 font-semibold text-warning">{t("Satisfactory")}</th>
                    <th className="p-3 font-semibold text-danger">{t("Needs improvement")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {a.rubric.map((r, j) => (
                    <tr key={j} className="align-top">
                      <td className="p-3 font-medium">{r.criterion}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums">{t("{n}", { n: r.weight })}%</span>
                          <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-surface-2 sm:block">
                            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, r.weight)}%` }} />
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-muted">{r.excellent}</td>
                      <td className="p-3 text-muted">{r.satisfactory}</td>
                      <td className="p-3 text-muted">{r.needsImprovement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      ))}

      <div className="flex justify-end">
        <MaterialGenerator course={course} kind="assignments" onDone={onUpdate} compact />
      </div>
    </div>
  );
}
