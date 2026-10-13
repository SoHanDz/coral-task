import { cn } from "@/lib/utils";
import type { DayState } from "@/lib/date/year-progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DOT_STYLES: Record<DayState, string> = {
  past: "bg-cyan-500",
  today: "scale-[1.9] bg-sky-500 ring-2 ring-sky-300",
  future: "bg-slate-200",
};

interface DayDotProps {
  state: DayState;
  title?: string;
  /** Name of the special event landing on this exact day, if any. */
  eventTitle?: string;
  /** Task completion for this day, if any task is due on it. */
  taskStats?: { completed: number; total: number };
}

export function DayDot({ state, title, eventTitle, taskStats }: DayDotProps) {
  const hasTooltip = Boolean(eventTitle || taskStats);

  const dot = (
    <span title={hasTooltip ? undefined : title} className="relative inline-flex size-[6px]">
      <span
        className={cn(
          "absolute inset-0 rounded-full transition-colors duration-200",
          DOT_STYLES[state]
        )}
      />
      {eventTitle && (
        <span
          aria-hidden
          className="absolute -inset-[3px] rounded-full ring-2 ring-fuchsia-400"
        />
      )}
    </span>
  );

  if (!hasTooltip) return dot;

  const lines = [
    title,
    taskStats && `${taskStats.completed}/${taskStats.total} việc hoàn thành`,
    eventTitle,
  ].filter(Boolean);

  return (
    <Tooltip>
      <TooltipTrigger render={dot} />
      <TooltipContent>{lines.join(" · ")}</TooltipContent>
    </Tooltip>
  );
}
