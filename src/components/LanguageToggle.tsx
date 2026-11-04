"use client";

import { Languages } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: { v: Lang; label: string; name: string }[] = [
  { v: "en", label: "EN", name: "English" },
  { v: "bn", label: "বাং", name: "বাংলা" },
];

/** English / Bangla switch for the studio UI. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t("Language")}
      title={t("Language")}
      className={cn("flex items-center gap-0.5 rounded-xl border border-border bg-surface-2 p-0.5", className)}
    >
      <Languages className="mx-1.5 size-3.5 text-subtle" aria-hidden />
      {OPTIONS.map(({ v, label, name }) => (
        <button
          key={v}
          role="radio"
          aria-checked={lang === v}
          aria-label={name}
          lang={v}
          onClick={() => setLang(v)}
          className={cn(
            "h-7 min-w-9 cursor-pointer rounded-lg px-2 text-xs font-semibold transition",
            lang === v ? "bg-surface text-accent shadow-sm" : "text-muted hover:text-text",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
