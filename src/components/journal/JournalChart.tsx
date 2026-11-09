"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  buildChartPoints,
  periodDays,
  shiftAnchor,
  summarize,
  type ChartPeriod,
} from "@/lib/journal/chart";
import { primaryNumberField } from "@/lib/journal/stats";
import type { JournalEntries, JournalField } from "@/lib/journal/types";

interface Props {
  fields: JournalField[];
  entries: JournalEntries;
}

const PERIODS: { key: ChartPeriod; label: string }[] = [
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
];

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function JournalChart({ fields, entries }: Props) {
  const [period, setPeriod] = useState<ChartPeriod>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const today = new Date();

  const primary = primaryNumberField(fields);
  const title = primary ? primary.label : "Số ngày đã ghi";
  const unit = primary?.unit ?? "";

  const days = periodDays(period, anchor);
  const points = buildChartPoints(entries, fields, days, today);
  const { total, average } = summarize(points);

  const config = {
    value: { label: title, color: "var(--color-teal-500, #14b8a6)" },
  } satisfies ChartConfig;

  const range =
    period === "week"
      ? `${format(days[0], "dd/MM")} - ${format(days[days.length - 1], "dd/MM")}`
      : format(days[0], "MM/yyyy");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              type="button"
              size="sm"
              variant={p.key === period ? "default" : "outline"}
              onClick={() => {
                setPeriod(p.key);
                setAnchor(new Date());
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Kỳ trước"
            onClick={() => setAnchor((a) => shiftAnchor(period, a, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-24 text-center text-sm text-slate-600">
            {range}
          </span>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Kỳ sau"
            disabled={days[days.length - 1] >= today}
            onClick={() => setAnchor((a) => shiftAnchor(period, a, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Tổng</p>
          <p className="text-lg font-semibold text-slate-700">
            {formatNumber(total)} {unit}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Trung bình mỗi ngày</p>
          <p className="text-lg font-semibold text-slate-700">
            {formatNumber(average)} {unit}
          </p>
        </div>
      </div>

      <p className="text-xs font-medium text-slate-500">{title}</p>
      <ChartContainer config={config} className="h-48 w-full">
        <BarChart data={points} margin={{ left: 0, right: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={period === "month" ? 2 : 0}
          />
          <YAxis hide allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={4}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
