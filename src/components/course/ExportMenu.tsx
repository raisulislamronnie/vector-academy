"use client";

import { ChevronDown, Download, FileText, FileType2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Menu } from "@/components/ui";
import type { DocModel } from "@/lib/export/doc-model";
import { useI18n } from "@/lib/i18n";

export interface ExportOption {
  label: string;
  format: "pdf" | "docx";
  build: () => DocModel;
  hint?: string;
}

export async function runExport(opt: Pick<ExportOption, "format" | "build">, accent: string) {
  const model = opt.build();
  if (opt.format === "pdf") {
    const { exportPdf } = await import("@/lib/export/pdf");
    await exportPdf(model, accent);
  } else {
    const { exportDocx } = await import("@/lib/export/docx");
    await exportDocx(model, accent);
  }
}

export function ExportMenu({ options, accent, label }: { options: ExportOption[]; accent: string; label?: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Menu
      trigger={(p) => (
        <Button size="sm" loading={busy} {...p}>
          {!busy && <Download className="size-3.5" />} {label ?? t("Download")} <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      )}
      items={options.map((o) => ({
        label: o.label,
        hint: o.hint ?? (o.format === "pdf" ? "PDF" : "DOCX"),
        icon: o.format === "pdf" ? <FileText /> : <FileType2 />,
        onClick: async () => {
          setBusy(true);
          try {
            await runExport(o, accent);
            toast.success(t("Download started"));
          } catch (e) {
            console.error(e);
            toast.error(t("Export failed"));
          } finally {
            setBusy(false);
          }
        },
      }))}
    />
  );
}
