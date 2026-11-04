import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#f59e0b] shadow-[0_6px_16px_-6px_rgb(234_88_12/0.7)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px] text-white" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 5.5l7.5 13 7.5-13" />
      </svg>
    </span>
  );
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {withText ? (
        <span className="font-display text-[19px] leading-none tracking-tight">
          vector<span className="text-accent">.</span>
          <span className="font-normal text-muted">academy</span>
        </span>
      ) : null}
    </span>
  );
}
