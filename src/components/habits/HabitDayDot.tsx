import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HabitDayState } from "@/lib/habits/stats";

const DOT_STYLES: Record<HabitDayState, string> = {
  "all-done": "bg-emerald-500",
  missed: "bg-slate-300",
  "no-habit": "border border-slate-300 bg-transparent",
};

interface HabitDayDotProps {
  dayState: HabitDayState;
  /** True for the real current day — gets the enlarged/ringed treatment. */
  today?: boolean;
  title: string;
  /** Omitted entirely for "no-habit" days. */
  completedCount?: number;
  totalCount?: number;
}

export function HabitDayDot({ dayState, today = false, title, completedCount, totalCount }: HabitDayDotProps) {
  const hasTooltip = dayState !== "no-habit" && completedCount !== undefined && totalCount !== undefined;

  const dot = (
    <span
      title={hasTooltip ? undefined : title}
      className={cn("relative inline-flex size-[6px]", today && "scale-[1.9]")}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full transition-colors duration-200",
          DOT_STYLES[dayState],
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
