"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeekDayMetrics } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface WeeklyDailyMetricsProps {
  days: WeekDayMetrics[];
  weekStartDate: string;
  weekEndDate: string;
}

function fmtWeight(value: number | null): string {
  return value != null ? value.toFixed(1) : "—";
}

function fmtCalories(value: number | null): string {
  return value != null ? Math.round(value).toLocaleString() : "—";
}

export function WeeklyDailyMetrics({
  days,
  weekStartDate,
  weekEndDate,
}: WeeklyDailyMetricsProps) {
  const weekLabel = `${format(parseISO(weekStartDate), "MMM d")} – ${format(parseISO(weekEndDate), "MMM d")}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">This week</CardTitle>
        <p className="text-xs text-muted-foreground">{weekLabel}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Day</th>
              <th className="pb-2 pr-3 font-medium">Weight</th>
              <th className="pb-2 pr-3 font-medium">Consumed</th>
              <th className="pb-2 pr-3 font-medium">Burned</th>
              <th className="pb-2 pr-3 font-medium">Run avg wt</th>
              <th className="pb-2 pr-3 font-medium">Run avg in</th>
              <th className="pb-2 font-medium">Run avg burn</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr
                key={day.date}
                className={cn(
                  "border-b border-border/50 last:border-0",
                  day.isToday && "bg-muted/40"
                )}
              >
                <td className="py-2.5 pr-3">
                  <span
                    className={cn(
                      "font-medium",
                      day.isToday && "text-foreground",
                      day.isFuture && "text-muted-foreground"
                    )}
                  >
                    {day.dayLabel}
                  </span>
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {format(parseISO(day.date), "M/d")}
                  </span>
                </td>
                <td className="py-2.5 pr-3 tabular-nums">
                  {fmtWeight(day.weightLbs)}
                </td>
                <td className="py-2.5 pr-3 tabular-nums">
                  {fmtCalories(day.caloriesConsumed)}
                </td>
                <td className="py-2.5 pr-3 tabular-nums">
                  {fmtCalories(day.caloriesBurned)}
                </td>
                <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
                  {fmtWeight(day.runningAvgWeight)}
                </td>
                <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
                  {fmtCalories(day.runningAvgConsumed)}
                </td>
                <td className="py-2.5 tabular-nums text-muted-foreground">
                  {fmtCalories(day.runningAvgBurned)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Burned = active + resting energy · Run avg = cumulative Mon–that day
        </p>
      </CardContent>
    </Card>
  );
}
