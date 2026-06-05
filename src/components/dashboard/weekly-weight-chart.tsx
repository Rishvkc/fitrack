"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { weightVsOnTrackColor } from "@/lib/calculations";
import type { WeeklyWeightSnapshot } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface WeeklyWeightChartProps {
  weeks: WeeklyWeightSnapshot[];
}

const barColors = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  muted: "bg-muted",
};

export function WeeklyWeightChart({ weeks }: WeeklyWeightChartProps) {
  if (weeks.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Weekly avg weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Not enough weigh-in data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxVal = Math.max(
    ...weeks.map((w) => w.avgWeight),
    ...weeks.map((w) => w.onTrackWeight)
  );
  const minVal = Math.min(
    ...weeks.map((w) => w.avgWeight),
    ...weeks.map((w) => w.onTrackWeight)
  );
  const range = maxVal - minVal || 1;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Weekly avg weight
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {weeks.map((week) => {
            const color = weightVsOnTrackColor(
              week.avgWeight,
              week.onTrackWeight
            );
            const barWidth = `${Math.min(100, ((week.avgWeight - minVal) / range) * 100)}%`;
            const targetPos = `${((week.onTrackWeight - minVal) / range) * 100}%`;

            return (
              <div key={week.weekEndDate} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">
                  {format(parseISO(week.weekEndDate), "M/d")}
                </span>
                <div className="relative flex-1">
                  <div className="h-6 w-full rounded bg-muted/50">
                    <div
                      className={cn("h-full rounded", barColors[color])}
                      style={{ width: barWidth }}
                    />
                  </div>
                  <div
                    className="absolute top-0 h-full border-l-2 border-dashed border-foreground/30"
                    style={{ left: targetPos }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-medium">
                  {week.avgWeight.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Dashed line = on-track target · 7-day rolling avg per week
        </p>
      </CardContent>
    </Card>
  );
}
