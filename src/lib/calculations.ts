import {
  differenceInCalendarDays,
  parseISO,
  format,
  addDays,
  subDays,
} from "date-fns";
import type { LogEntry, Settings } from "@/db/schema";

export type StatusBadge = "on_track" | "behind" | "goal_reached";

export interface EnrichedLogEntry extends LogEntry {
  computedTdee: number | null;
  computedDeficit: number | null;
}

export function enrichLogEntry(
  entry: LogEntry,
  tdeeBaseline: number
): EnrichedLogEntry {
  const tdee =
    entry.tdee ??
    (entry.activeCalories != null && entry.restingCalories != null
      ? entry.activeCalories + entry.restingCalories
      : entry.activeCalories != null || entry.restingCalories != null
        ? (entry.activeCalories ?? 0) + (entry.restingCalories ?? 0)
        : tdeeBaseline);

  const deficit =
    entry.deficit ??
    (entry.caloriesConsumed != null ? tdee - entry.caloriesConsumed : null);

  return {
    ...entry,
    tdee: entry.tdee ?? (entry.caloriesConsumed != null ? tdee : null),
    deficit,
    computedTdee: tdee,
    computedDeficit: deficit,
  };
}

export function targetDeficit(settings: Settings): number {
  const weeklyLossLbs = settings.startWeightLbs * settings.targetLossPctWeek;
  return Math.round((weeklyLossLbs * 3500) / 7);
}

export function onTrackWeight(settings: Settings, date: string): number {
  const daysElapsed = differenceInCalendarDays(
    parseISO(date),
    parseISO(settings.startDate)
  );
  const dailyLoss =
    (settings.startWeightLbs * settings.targetLossPctWeek) / 7;
  return settings.startWeightLbs - dailyLoss * Math.max(0, daysElapsed);
}

export function targetWeeklyLossLbs(settings: Settings): number {
  return settings.startWeightLbs * settings.targetLossPctWeek;
}

/** 7-day rolling average of non-null weigh-ins ending on asOfDate (inclusive). */
export function rollingAvgWeight(
  entries: LogEntry[],
  asOfDate: string,
  windowDays = 7
): number | null {
  const end = parseISO(asOfDate);
  const weights: number[] = [];

  for (let i = 0; i < windowDays; i++) {
    const d = format(subDays(end, i), "yyyy-MM-dd");
    const entry = entries.find((e) => e.date === d);
    if (entry?.weightLbs != null) weights.push(entry.weightLbs);
  }

  if (weights.length === 0) return null;
  return weights.reduce((a, b) => a + b, 0) / weights.length;
}

export interface WeeklyWeightSnapshot {
  weekEndDate: string;
  avgWeight: number;
  onTrackWeight: number;
  sampleCount: number;
}

/** Rolling 7-day avg snapshots at weekly intervals (current week + prior weeks). */
export function weeklyAvgWeightHistory(
  settings: Settings,
  entries: LogEntry[],
  asOfDate: string,
  numWeeks = 8
): WeeklyWeightSnapshot[] {
  const snapshots: WeeklyWeightSnapshot[] = [];

  for (let w = numWeeks - 1; w >= 0; w--) {
    const weekEnd = format(subDays(parseISO(asOfDate), w * 7), "yyyy-MM-dd");
    const avg = rollingAvgWeight(entries, weekEnd);
    if (avg == null) continue;

    const weightsInWindow: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(parseISO(weekEnd), i), "yyyy-MM-dd");
      const entry = entries.find((e) => e.date === d);
      if (entry?.weightLbs != null) weightsInWindow.push(entry.weightLbs);
    }

    snapshots.push({
      weekEndDate: weekEnd,
      avgWeight: avg,
      onTrackWeight: onTrackWeight(settings, weekEnd),
      sampleCount: weightsInWindow.length,
    });
  }

  return snapshots;
}

export function weightVsOnTrackColor(
  avgWeight: number | null,
  onTrack: number
): "green" | "amber" | "red" | "muted" {
  if (avgWeight == null) return "muted";
  const delta = avgWeight - onTrack;
  if (delta <= 0) return "green";
  if (delta <= 0.5) return "amber";
  return "red";
}

export function weeksRemaining(settings: Settings, today: string): number {
  const endDate = addDays(
    parseISO(settings.startDate),
    settings.durationWeeks * 7
  );
  const days = differenceInCalendarDays(endDate, parseISO(today));
  return Math.max(0, days / 7);
}

export function linearRegression(
  points: { x: number; y: number }[]
): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function projectedWeight(
  settings: Settings,
  entries: LogEntry[],
  date: string
): number | null {
  const startMs = parseISO(settings.startDate).getTime();
  const dayMs = 86400000;

  const weightPoints = entries
    .filter((e) => e.weightLbs != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((e) => ({
      x: (parseISO(e.date).getTime() - startMs) / dayMs,
      y: e.weightLbs!,
    }));

  const reg = linearRegression(weightPoints);
  if (!reg) return null;

  const daysElapsed =
    (parseISO(date).getTime() - startMs) / dayMs;
  return reg.intercept + reg.slope * daysElapsed;
}

export function weightTrendLbsPerWeek(
  settings: Settings,
  entries: LogEntry[]
): number | null {
  const startMs = parseISO(settings.startDate).getTime();
  const dayMs = 86400000;

  const weightPoints = entries
    .filter((e) => e.weightLbs != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((e) => ({
      x: (parseISO(e.date).getTime() - startMs) / dayMs,
      y: e.weightLbs!,
    }));

  const reg = linearRegression(weightPoints);
  if (!reg) return null;
  return reg.slope * 7;
}

export function weeklyAvgDeficit(
  entries: EnrichedLogEntry[],
  asOfDate: string
): number | null {
  const end = parseISO(asOfDate);
  const deficits: number[] = [];

  for (let i = 1; i <= 7; i++) {
    const d = format(subDays(end, i), "yyyy-MM-dd");
    const entry = entries.find((e) => e.date === d);
    if (entry?.computedDeficit != null) {
      deficits.push(entry.computedDeficit);
    }
  }

  if (deficits.length === 0) return null;
  return Math.round(deficits.reduce((a, b) => a + b, 0) / deficits.length);
}

export function getStatusBadge(
  settings: Settings,
  entries: LogEntry[],
  today: string
): StatusBadge {
  const avg7 = rollingAvgWeight(entries, today);
  if (avg7 == null) return "behind";

  if (avg7 <= settings.goalWeightLbs) {
    return "goal_reached";
  }

  const onTrack = onTrackWeight(settings, today);
  const delta = avg7 - onTrack;

  if (delta <= 0.5) return "on_track";
  return "behind";
}

export function deficitColor(
  deficit: number | null,
  target: number
): "green" | "amber" | "red" | "muted" {
  if (deficit == null) return "muted";
  if (deficit >= target) return "green";
  if (deficit >= target * 0.9) return "amber";
  return "red";
}

export function barDeficitColor(
  deficit: number | null,
  target: number
): "green" | "blue" | "red" | "muted" {
  if (deficit == null) return "muted";
  if (deficit >= target) return "green";
  if (deficit >= target * 0.85) return "blue";
  return "red";
}

export interface ChartDataPoint {
  date: string;
  rollingAvg: number | null;
  projected: number | null;
  goal: number;
}

export function buildWeightChartData(
  settings: Settings,
  entries: LogEntry[],
  asOfDate?: string
): ChartDataPoint[] {
  const endDate = addDays(
    parseISO(settings.startDate),
    settings.durationWeeks * 7
  );
  const capDate = asOfDate ? parseISO(asOfDate) : endDate;
  const chartEnd = capDate < endDate ? capDate : endDate;
  const points: ChartDataPoint[] = [];
  let current = parseISO(settings.startDate);

  while (current <= chartEnd) {
    const dateStr = format(current, "yyyy-MM-dd");
    points.push({
      date: dateStr,
      rollingAvg: rollingAvgWeight(entries, dateStr),
      projected: projectedWeight(settings, entries, dateStr),
      goal: onTrackWeight(settings, dateStr),
    });
    current = addDays(current, 1);
  }

  return points;
}

export function formatDelta(value: number, unit: string): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} ${unit}`;
}
