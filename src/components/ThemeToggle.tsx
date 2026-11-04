"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const opts = [
    { v: "light", icon: Sun, label: "Light" },
    { v: "dark", icon: Moon, label: "Dark" },
    { v: "system", icon: Monitor, label: "System" },
  ];
  return (
    <div className="flex rounded-lg border border-border bg-surface-2 p-0.5" role="radiogroup" aria-label={t("Theme")}>
      {opts.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          role="radio"
          aria-checked={mounted && theme === v}
          aria-label={t(label)}
          title={t(label)}
          onClick={() => setTheme(v)}
          className={cn(
            "grid h-7 flex-1 cursor-pointer place-items-center rounded-md transition",
            mounted && theme === v ? "bg-surface text-text shadow-sm" : "text-subtle hover:text-text",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
