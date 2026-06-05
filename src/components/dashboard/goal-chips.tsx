"use client";

import Link from "next/link";

interface GoalChipsProps {
  startWeight: number;
  goalWeight: number;
  lossPct: number;
  targetWeeklyLoss: number;
  durationWeeks: number;
}

export function GoalChips({
  startWeight,
  goalWeight,
  lossPct,
  targetWeeklyLoss,
  durationWeeks,
}: GoalChipsProps) {
  const chips = [
    { label: "Start", value: `${startWeight} lbs` },
    { label: "Goal", value: `${goalWeight} lbs` },
    { label: "Loss/week", value: `${(lossPct * 100).toFixed(1)}%` },
    { label: "Target loss", value: `${targetWeeklyLoss.toFixed(1)} lbs/wk` },
    { label: "Duration", value: `${durationWeeks} wks` },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href="/settings"
          className="rounded-full border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-accent"
        >
          <span className="text-muted-foreground">{chip.label}</span>{" "}
          <span className="font-medium">{chip.value}</span>
        </Link>
      ))}
    </div>
  );
}
