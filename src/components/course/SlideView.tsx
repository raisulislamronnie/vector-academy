"use client";

import type { Slide } from "@/lib/schemas";
import { plain } from "@/lib/export/doc-model";
import { cn } from "@/lib/utils";

/** Renders one slide at 16:9; all sizes scale with container width (cqw). */
export function SlideView({
  slide,
  index,
  total,
  theme,
  courseTitle,
  className,
}: {
  slide: Slide;
  index: number;
  total: number;
  theme: { from: string; to: string };
  courseTitle: string;
  className?: string;
}) {
  const hero = slide.layout === "title" || slide.layout === "quote";
  return (
    <div className={cn("@container relative aspect-video w-full overflow-hidden select-none", className)}>
      {hero ? (
        <div className="absolute inset-0 text-white" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}>
          <div className="absolute -top-[18cqw] -right-[10cqw] size-[46cqw] rounded-full bg-white/15" />
          <div className="absolute -bottom-[10cqw] right-[12cqw] size-[22cqw] rounded-full bg-white/10" />
          {slide.layout === "title" ? (
            <div className="absolute inset-0 flex flex-col justify-center px-[7cqw]">
              <div className="text-[1.3cqw] font-semibold tracking-[0.3em] opacity-80">VECTOR ACADEMY</div>
              <div className="mt-[1.6cqw] max-w-[80%] text-[4.8cqw] leading-[1.05] font-bold tracking-tight">{plain(slide.title)}</div>
              {slide.subtitle ? <div className="mt-[1.6cqw] max-w-[70%] text-[2cqw] opacity-85">{plain(slide.subtitle)}</div> : null}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col justify-center px-[9cqw]">
              <div className="font-display text-[12cqw] leading-[0.6] opacity-50">“</div>
              <div className="font-display text-[3.6cqw] leading-[1.2] italic">{plain(slide.quote || slide.title)}</div>
              <div className="mt-[2cqw] text-[1.6cqw] opacity-80">{plain(slide.subtitle || slide.title)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 bg-white text-[#17171c]">
          <div className="absolute inset-x-0 top-0 h-[0.9cqw]" style={{ background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }} />
          <div className="absolute inset-0 flex flex-col px-[5cqw] pt-[4.2cqw] pb-[5cqw]">
            <div className="text-[3.1cqw] leading-tight font-bold tracking-tight">{plain(slide.title)}</div>
            {slide.subtitle ? <div className="mt-[0.6cqw] text-[1.6cqw] text-[#6b6b76]">{plain(slide.subtitle)}</div> : null}
            <div className="mt-[2.4cqw] min-h-0 flex-1">
              {slide.layout === "two-column" && slide.columns.length ? (
                <div className="grid h-full grid-cols-2 gap-[2cqw]">
                  {slide.columns.slice(0, 2).map((c, i) => (
                    <div key={i} className={cn("rounded-[1.4cqw] border p-[2cqw]", i === 0 ? "border-[#fed7aa] bg-[#fff7ed]" : "border-[#ffe4d6] bg-[#fff4ee]")}>
                      <div className="text-[1.9cqw] font-bold" style={{ color: i === 0 ? theme.from : theme.to }}>
                        {plain(c.heading)}
                      </div>
                      <ul className="mt-[1.2cqw] space-y-[0.8cqw] text-[1.55cqw] leading-snug">
                        {c.bullets.map((b, j) => (
                          <li key={j} className="flex gap-[0.8cqw]">
                            <span className="mt-[0.6cqw] size-[0.6cqw] shrink-0 rounded-full" style={{ background: i === 0 ? theme.from : theme.to }} />
                            {plain(b)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul
                  className={cn(
                    "space-y-[1.2cqw] text-[1.9cqw] leading-snug",
                    slide.layout === "summary" && "h-full rounded-[1.4cqw] border border-[#ececE7] bg-[#f7f7f5] p-[2.4cqw]",
                  )}
                >
                  {slide.bullets.map((b, j) => (
                    <li key={j} className="flex gap-[1.2cqw]">
                      {slide.layout === "summary" ? (
                        <span className="grid size-[2cqw] shrink-0 place-items-center rounded-full text-[1.1cqw] text-white" style={{ background: theme.from }}>
                          ✓
                        </span>
                      ) : (
                        <span className="mt-[0.75cqw] size-[0.75cqw] shrink-0 rounded-full" style={{ background: theme.from }} />
                      )}
                      <span>{plain(b)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="absolute inset-x-[5cqw] bottom-[1.6cqw] flex justify-between text-[1.05cqw] text-[#9a9aa4]">
            <span className="truncate">{courseTitle}</span>
            <span>
              {index + 1} / {total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
