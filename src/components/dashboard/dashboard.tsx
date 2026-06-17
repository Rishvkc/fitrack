"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { addDays, format, parseISO, startOfWeek, subDays } from "date-fns";
import { Settings, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoalProgressBar } from "@/components/dashboard/goal-progress";
import { StatCards } from "@/components/dashboard/stat-cards";
import { WeightChart } from "@/components/dashboard/weight-chart";
import { WeeklyDailyMetrics } from "@/components/dashboard/weekly-daily-metrics";
import { WeeklyWeightChart } from "@/components/dashboard/weekly-weight-chart";
import { CoachBriefCard } from "@/components/dashboard/coach-brief";
import { MissingDataBanner } from "@/components/dashboard/missing-data-banner";
import { ManualEntryForm } from "@/components/dashboard/manual-entry-form";
import {
  buildCurrentWeekDailyMetrics,
  buildWeightChartData,
  formatWeeksAndDaysRemaining,
  getStatusBadge,
  goalProgress,
  onTrackWeight,
  rollingAvgWeight,
  weeklyAvgWeightHistory,
} from "@/lib/calculations";
import type { LogEntry, Settings as SettingsType } from "@/db/schema";

const statusLabels = {
  on_track: { label: "On track ↗", variant: "success" as const },
  behind: { label: "Behind ↘", variant: "warning" as const },
  goal_reached: { label: "Goal reached", variant: "goal" as const },
};

export function Dashboard() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState<string | undefined>();

  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    const [settingsRes, logsRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/log"),
    ]);
    const settingsData = await settingsRes.json();
    const logsData = await logsRes.json();
    setSettings(settingsData.settings);
    setEntries(logsData.entries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Welcome to CutTrack</h1>
        <p className="text-muted-foreground">
          Configure your cut parameters to get started.
        </p>
        <Button asChild>
          <Link href="/settings">Set up cut</Link>
        </Button>
      </div>
    );
  }

  const status = getStatusBadge(settings, entries, today);
  const timeRemaining = formatWeeksAndDaysRemaining(settings, today);

  const latestEntry = [...entries].sort((a, b) =>
    b.date.localeCompare(a.date)
  )[0];

  const avg7 = rollingAvgWeight(entries, today);
  const priorAvg7 = rollingAvgWeight(entries, weekAgo);
  const rollingAvgDelta =
    avg7 != null && priorAvg7 != null ? avg7 - priorAvg7 : null;

  const onTrack = onTrackWeight(settings, today);
  const onTrackDelta = avg7 != null ? avg7 - onTrack : null;
  const cutProgress = goalProgress(settings, avg7);

  const weeklyHistory = weeklyAvgWeightHistory(settings, entries, today);
  const chartData = buildWeightChartData(settings, entries);
  const weekStart = startOfWeek(parseISO(today), { weekStartsOn: 1 });
  const weekDays = buildCurrentWeekDailyMetrics(entries, today);
  const weekStartDate = format(weekStart, "yyyy-MM-dd");
  const weekEndDate = format(addDays(weekStart, 6), "yyyy-MM-dd");
  const showMissingBanner = latestEntry?.weightLbs == null;

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 pb-12">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">CutTrack</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {settings.durationWeeks} week cut · started{" "}
            {format(parseISO(settings.startDate), "MMM d, yyyy")} ·{" "}
            {timeRemaining}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusLabels[status].variant}>
            {statusLabels[status].label}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setManualOpen(true)}
            title="Log entry"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>



      <div className="mb-6">
        <GoalProgressBar
          progress={cutProgress}
          startWeightLbs={settings.startWeightLbs}
          goalWeightLbs={settings.goalWeightLbs}
          currentWeight={avg7}
        />
      </div>

      <div className="mb-6">
        <StatCards
          rollingAvgWeight={avg7}
          rollingAvgDelta={rollingAvgDelta}
          onTrackWeight={onTrack}
          onTrackDelta={onTrackDelta}
        />
      </div>

      {showMissingBanner && latestEntry && (
        <div className="mb-6">
          <MissingDataBanner
            date={latestEntry.date}
            onManualEntry={() => {
              setManualDate(latestEntry.date);
              setManualOpen(true);
            }}
          />
        </div>
      )}

      <div className="mb-6">
        <WeightChart
          data={chartData}
          durationWeeks={settings.durationWeeks}
        />
      </div>

      <div className="mb-6">
        <WeeklyDailyMetrics
          days={weekDays}
          weekStartDate={weekStartDate}
          weekEndDate={weekEndDate}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <WeeklyWeightChart weeks={weeklyHistory} />
        <CoachBriefCard date={today} />
      </div>

      <ManualEntryForm
        open={manualOpen}
        onOpenChange={setManualOpen}
        defaultDate={manualDate}
        onSuccess={loadData}
      />
    </div>
  );
}
