"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { weightVsOnTrackColor } from "@/lib/calculations";

interface StatCardsProps {
  rollingAvgWeight: number | null;
  rollingAvgDelta: number | null;
  onTrackWeight: number;
  onTrackDelta: number | null;
  priorRollingAvg: number | null;
  targetWeeklyLoss: number;
  actualWeeklyChange: number | null;
}

function colorClass(color: "green" | "amber" | "red" | "muted") {
  switch (color) {
    case "green":
      return "text-emerald-600";
    case "amber":
      return "text-amber-600";
    case "red":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

export function StatCards({
  rollingAvgWeight,
  rollingAvgDelta,
  onTrackWeight,
  onTrackDelta,
  priorRollingAvg,
  targetWeeklyLoss,
  actualWeeklyChange,
}: StatCardsProps) {
  const onTrackColor = weightVsOnTrackColor(
    rollingAvgWeight,
    onTrackWeight
  );

  const weeklyChangeColor =
    actualWeeklyChange != null
      ? actualWeeklyChange <= -targetWeeklyLoss * 0.9
        ? "green"
        : actualWeeklyChange <= -targetWeeklyLoss * 0.5
          ? "amber"
          : "red"
      : "muted";

  const stats = [
    {
      label: "7-day avg weight",
      value:
        rollingAvgWeight != null
          ? `${rollingAvgWeight.toFixed(1)} lbs`
          : "—",
      delta:
        rollingAvgDelta != null
          ? `${rollingAvgDelta > 0 ? "+" : ""}${rollingAvgDelta.toFixed(1)} vs prior week`
          : null,
      deltaColor:
        rollingAvgDelta != null && rollingAvgDelta <= 0
          ? "text-emerald-600"
          : "text-amber-600",
    },
    {
      label: "On-track weight",
      value: `${onTrackWeight.toFixed(1)} lbs`,
      delta:
        onTrackDelta != null
          ? `${Math.abs(onTrackDelta).toFixed(1)} lbs ${onTrackDelta <= 0 ? "ahead" : "behind"}`
          : null,
      deltaColor: colorClass(onTrackColor),
    },
    {
      label: "Prior 7-day avg",
      value:
        priorRollingAvg != null
          ? `${priorRollingAvg.toFixed(1)} lbs`
          : "—",
      delta: null,
      deltaColor: "text-muted-foreground",
    },
    {
      label: "Weekly avg change",
      value:
        actualWeeklyChange != null
          ? `${actualWeeklyChange > 0 ? "+" : ""}${actualWeeklyChange.toFixed(1)} lbs`
          : "—",
      delta:
        actualWeeklyChange != null
          ? `target ${(-targetWeeklyLoss).toFixed(1)} lbs/wk`
          : null,
      deltaColor: colorClass(weeklyChangeColor),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {stat.value}
            </p>
            {stat.delta && (
              <p className={cn("mt-1 text-xs", stat.deltaColor)}>{stat.delta}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
