import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HabitIntensity } from "@/lib/habits/stats";

export const HABIT_LEVEL_STYLES: Record<HabitIntensity, string> = {
  0: "bg-slate-300",
  1: "bg-emerald-200",
  2: "bg-emerald-300",
  3: "bg-emerald-500",
  4: "bg-emerald-700",
};

interface HabitDayDotProps {
  /** "future" / "no-habit" days render muted; otherwise the intensity level picks the green. */
  kind: "future" | "no-habit" | "level";
  level?: HabitIntensity;
  /** True for the real current day — gets the enlarged/ringed treatment. */
  today?: boolean;
  /** Bigger dot for the single-month view. */
  large?: boolean;
  title: string;
  /** Omitted entirely for "no-habit" / "future" days. */
  completedCount?: number;
  totalCount?: number;
}

export function HabitDayDot({
  kind,
  level = 0,
  today = false,
  large = false,
  title,
  completedCount,
  totalCount,
}: HabitDayDotProps) {
  const hasTooltip = kind === "level" && completedCount !== undefined && totalCount !== undefined;

  const dot = (
    <span
      title={hasTooltip ? undefined : title}
      className={cn("relative inline-flex", large ? "size-3.5" : "size-[6px]", today && (large ? "scale-125" : "scale-[1.9]"))}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full transition-colors duration-200",
          kind === "level" && HABIT_LEVEL_STYLES[level],
          kind === "future" && "bg-slate-200",
          kind === "no-habit" && "border border-slate-300 bg-transparent",
          today && "ring-2 ring-sky-300"
        )}
      />
    </span>
  );

  if (!hasTooltip) return dot;

  return (
    <Tooltip>
      <TooltipTrigger render={dot} />
      <TooltipContent>
        {title} · {completedCount}/{totalCount} thói quen hoàn thành
      </TooltipContent>
    </Tooltip>
  );
}
