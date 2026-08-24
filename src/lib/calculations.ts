import {
  differenceInCalendarDays,
  parseISO,
  format,
  addDays,
  subDays,
  startOfWeek,
} from "date-fns";
import type { LogEntry, Settings } from "@/db/schema";

export type StatusBadge = "on_track" | "behind" | "goal_reached";

/** Only entries on or after the cut start date (yyyy-MM-dd). */
export function filterEntriesFromStartDate(
  entries: LogEntry[],
  startDate: string
): LogEntry[] {
  return entries.filter((e) => e.date >= startDate);
}

function isOnOrAfterStartDate(date: string, startDate: string): boolean {
  return date >= startDate;
}

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

export function onTrackWeight(
  settings: Settings,
  entries: LogEntry[],
  date: string
): number {
  const start = parseISO(settings.startDate);
  const daysElapsed = Math.max(
    0,
    differenceInCalendarDays(parseISO(date), start)
  );
  const weekIndex = Math.floor(daysElapsed / 7);
  const dayInWeek = daysElapsed % 7;
  const pct = settings.targetLossPctWeek;

  let weekStartOnTrack = settings.startWeightLbs;

  for (let w = 0; w < weekIndex; w++) {
    const baseline = baselineWeightForCutWeek(settings, entries, w);
    weekStartOnTrack -= baseline * pct;
  }

  const currentWeekBaseline = baselineWeightForCutWeek(
    settings,
    entries,
    weekIndex
  );
  const dailyLoss = (currentWeekBaseline * pct) / 7;

  return weekStartOnTrack - dailyLoss * dayInWeek;
}

/** Prior week's 7-day avg at week end, or start weight for week 0. */
function baselineWeightForCutWeek(
  settings: Settings,
  entries: LogEntry[],
  weekIndex: number
): number {
  if (weekIndex === 0) return settings.startWeightLbs;

  const priorWeekEnd = format(
    addDays(parseISO(settings.startDate), (weekIndex - 1) * 7 + 6),
    "yyyy-MM-dd"
  );
  return (
    rollingAvgWeight(entries, priorWeekEnd, 7, settings.startDate) ??
    settings.startWeightLbs
  );
}

export function targetWeeklyLossLbs(
  settings: Settings,
  entries: LogEntry[],
  asOfDate: string
): number {
  const weekIndex = Math.floor(
    Math.max(
      0,
      differenceInCalendarDays(parseISO(asOfDate), parseISO(settings.startDate))
    ) / 7
  );
  const baseline = baselineWeightForCutWeek(settings, entries, weekIndex);
  return baseline * settings.targetLossPctWeek;
}

/** 7-day rolling average of non-null weigh-ins ending on asOfDate (inclusive). */
export function rollingAvgWeight(
  entries: LogEntry[],
  asOfDate: string,
  windowDays = 7,
  startDate?: string
): number | null {
  const end = parseISO(asOfDate);
  const weights: number[] = [];

  for (let i = 0; i < windowDays; i++) {
    const d = format(subDays(end, i), "yyyy-MM-dd");
    if (startDate && !isOnOrAfterStartDate(d, startDate)) continue;
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
    if (!isOnOrAfterStartDate(weekEnd, settings.startDate)) continue;

    const avg = rollingAvgWeight(
      entries,
      weekEnd,
      7,
      settings.startDate
    );
    if (avg == null) continue;

    const weightsInWindow: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(parseISO(weekEnd), i), "yyyy-MM-dd");
      if (!isOnOrAfterStartDate(d, settings.startDate)) continue;
      const entry = entries.find((e) => e.date === d);
      if (entry?.weightLbs != null) weightsInWindow.push(entry.weightLbs);
    }

    snapshots.push({
      weekEndDate: weekEnd,
      avgWeight: avg,
      onTrackWeight: onTrackWeight(settings, entries, weekEnd),
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

export function formatWeeksAndDaysRemaining(
  settings: Settings,
  today: string
): string {
  const endDate = addDays(
    parseISO(settings.startDate),
    settings.durationWeeks * 7
  );
  const daysLeft = Math.max(
    0,
    differenceInCalendarDays(endDate, parseISO(today))
  );

  if (daysLeft === 0) return "0 days remaining";

  const weeks = Math.floor(daysLeft / 7);
  const days = daysLeft % 7;

  if (weeks === 0) {
    return `${days} ${days === 1 ? "day" : "days"} remaining`;
  }
  if (days === 0) {
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} remaining`;
  }
  return `${weeks} ${weeks === 1 ? "week" : "weeks"} and ${days} ${days === 1 ? "day" : "days"} remaining`;
}

export interface GoalProgress {
  totalToLose: number;
  lost: number;
  remaining: number;
  pct: number;
  goalReached: boolean;
}

export function goalProgress(
  settings: Settings,
  currentWeight: number | null
): GoalProgress {
  const totalToLose = settings.startWeightLbs - settings.goalWeightLbs;
  const safeTotal = Math.max(totalToLose, 0.1);

  if (currentWeight == null) {
    return {
      totalToLose,
      lost: 0,
      remaining: totalToLose,
      pct: 0,
      goalReached: false,
    };
  }

  const lost = Math.max(0, settings.startWeightLbs - currentWeight);
  const remaining = Math.max(0, currentWeight - settings.goalWeightLbs);
  const goalReached = currentWeight <= settings.goalWeightLbs;
  const pct = Math.min(100, (lost / safeTotal) * 100);

  return { totalToLose, lost, remaining, pct, goalReached };
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
    .filter(
      (e) =>
        e.weightLbs != null && isOnOrAfterStartDate(e.date, settings.startDate)
    )
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
    .filter(
      (e) =>
        e.weightLbs != null && isOnOrAfterStartDate(e.date, settings.startDate)
    )
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
  const avg7 = rollingAvgWeight(entries, today, 7, settings.startDate);
  if (avg7 == null) return "behind";

  if (avg7 <= settings.goalWeightLbs) {
    return "goal_reached";
  }

  const onTrack = onTrackWeight(settings, entries, today);
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
  week: number;
  weekLabel: string;
  date: string;
  rollingAvg: number | null;
  projected: number | null;
  goal: number;
}

/** One point per week: 7-day rolling avg at each week's end, spanning full cut duration. */
export function buildWeightChartData(
  settings: Settings,
  entries: LogEntry[]
): ChartDataPoint[] {
  const start = parseISO(settings.startDate);
  const points: ChartDataPoint[] = [];

  for (let week = 1; week <= settings.durationWeeks; week++) {
    const weekEnd = addDays(start, week * 7 - 1);
    const dateStr = format(weekEnd, "yyyy-MM-dd");
    points.push({
      week,
      weekLabel: `Wk ${week}`,
      date: dateStr,
      rollingAvg: rollingAvgWeight(entries, dateStr, 7, settings.startDate),
      projected: projectedWeight(settings, entries, dateStr),
      goal: onTrackWeight(settings, entries, dateStr),
    });
  }

  return points;
}

export function formatDelta(value: number, unit: string): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} ${unit}`;
}

function avgNonNull(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function caloriesBurned(entry: LogEntry): number | null {
  if (entry.activeCalories != null || entry.restingCalories != null) {
    return (entry.activeCalories ?? 0) + (entry.restingCalories ?? 0);
  }
  return entry.tdee;
}

export interface WeekDayMetrics {
  date: string;
  dayLabel: string;
  isToday: boolean;
  isFuture: boolean;
  weightLbs: number | null;
  caloriesConsumed: number | null;
  caloriesBurned: number | null;
  activeCalories: number | null;
  restingCalories: number | null;
  liftingVolumeLbs: number | null;
  runningAvgWeight: number | null;
  runningAvgConsumed: number | null;
  runningAvgBurned: number | null;
  runningAvgLiftingVolume: number | null;
}

export interface WeeklyLiftingSnapshot {
  weekEndDate: string;
  weekLabel: string;
  totalVolume: number;
  weeklyAvgVolume: number;
  liftDays: number;
}

/** Weekly lifting volume trend (avg lbs per lift day, per week). */
export function weeklyLiftingVolumeHistory(
  entries: LogEntry[],
  asOfDate: string,
  startDate: string,
  numWeeks = 8
): WeeklyLiftingSnapshot[] {
  const snapshots: WeeklyLiftingSnapshot[] = [];

  for (let w = numWeeks - 1; w >= 0; w--) {
    const weekEnd = format(subDays(parseISO(asOfDate), w * 7), "yyyy-MM-dd");
    if (!isOnOrAfterStartDate(weekEnd, startDate)) continue;

    const volumes: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(parseISO(weekEnd), i), "yyyy-MM-dd");
      if (!isOnOrAfterStartDate(d, startDate)) continue;
      const entry = entries.find((e) => e.date === d);
      if (entry?.liftingVolumeLbs != null) {
        volumes.push(entry.liftingVolumeLbs);
      }
    }

    if (volumes.length === 0) continue;

    const totalVolume = volumes.reduce((a, b) => a + b, 0);
    snapshots.push({
      weekEndDate: weekEnd,
      weekLabel: format(parseISO(weekEnd), "M/d"),
      totalVolume,
      weeklyAvgVolume: totalVolume / volumes.length,
      liftDays: volumes.length,
    });
  }

  return snapshots;
}

/** Mon–Sun daily metrics for the calendar week containing asOfDate (cut start onward). */
export function buildCurrentWeekDailyMetrics(
  entries: LogEntry[],
  asOfDate: string,
  startDate: string
): WeekDayMetrics[] {
  const ref = parseISO(asOfDate);
  const weekStart = startOfWeek(ref, { weekStartsOn: 1 });
  const weights: number[] = [];
  const consumed: number[] = [];
  const burned: number[] = [];
  const liftingVolumes: number[] = [];
  const days: WeekDayMetrics[] = [];

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dateStr = format(day, "yyyy-MM-dd");
    if (!isOnOrAfterStartDate(dateStr, startDate)) continue;

    const entry = entries.find((e) => e.date === dateStr);

    const weightLbs = entry?.weightLbs ?? null;
    const caloriesConsumed = entry?.caloriesConsumed ?? null;
    const activeCalories = entry?.activeCalories ?? null;
    const restingCalories = entry?.restingCalories ?? null;
    const caloriesBurnedVal = entry ? caloriesBurned(entry) : null;
    const liftingVolumeLbs = entry?.liftingVolumeLbs ?? null;

    if (weightLbs != null) weights.push(weightLbs);
    if (caloriesConsumed != null) consumed.push(caloriesConsumed);
    if (caloriesBurnedVal != null) burned.push(caloriesBurnedVal);
    if (liftingVolumeLbs != null) liftingVolumes.push(liftingVolumeLbs);

    days.push({
      date: dateStr,
      dayLabel: format(day, "EEE"),
      isToday: dateStr === asOfDate,
      isFuture: dateStr > asOfDate,
      weightLbs,
      caloriesConsumed,
      caloriesBurned: caloriesBurnedVal,
      activeCalories,
      restingCalories,
      liftingVolumeLbs,
      runningAvgWeight: avgNonNull(weights),
      runningAvgConsumed: avgNonNull(consumed),
      runningAvgBurned: avgNonNull(burned),
      runningAvgLiftingVolume: avgNonNull(liftingVolumes),
    });
  }

  return days;
}
