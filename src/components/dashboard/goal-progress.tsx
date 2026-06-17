"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { GoalProgress } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface GoalProgressProps {
  progress: GoalProgress;
  startWeightLbs: number;
  goalWeightLbs: number;
  currentWeight: number | null;
}

export function GoalProgressBar({
  progress,
  startWeightLbs,
  goalWeightLbs,
  currentWeight,
}: GoalProgressProps) {
  const { lost, totalToLose, remaining, pct, goalReached } = progress;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cut progress
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {goalReached ? (
                "Goal reached"
              ) : (
                <>
                  {lost.toFixed(1)}
                  <span className="text-lg font-normal text-muted-foreground">
                    {" "}
                    / {totalToLose.toFixed(1)} lbs lost
                  </span>
                </>
              )}
            </p>
          </div>
          <p className="text-right text-2xl font-bold tabular-nums text-emerald-600">
            {Math.round(pct)}%
          </p>
        </div>

        <div className="relative h-4 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              goalReached
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-emerald-500 to-emerald-400"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{startWeightLbs.toFixed(1)} lbs start</span>
          <span>
            {currentWeight != null
              ? `${currentWeight.toFixed(1)} lbs now`
              : "No weigh-in yet"}
          </span>
          <span>{goalWeightLbs.toFixed(1)} lbs goal</span>
        </div>

        {!goalReached && remaining > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            {remaining.toFixed(1)} lbs to go — you&apos;re{" "}
            {Math.round(pct)}% of the way there.
          </p>
        )}
        {goalReached && (
          <p className="mt-3 text-sm text-emerald-600">
            You hit your goal weight. Nice work.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
