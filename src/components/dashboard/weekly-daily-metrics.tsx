"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { WeekDayMetrics } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface WeeklyDailyMetricsProps {
  days: WeekDayMetrics[];
  weekStartDate: string;
  weekEndDate: string;
  onUpdate: () => void;
}

type EditableField =
  | "weight_lbs"
  | "calories_consumed"
  | "active_calories"
  | "resting_calories"
  | "lifting_volume_lbs";

interface EditableCellProps {
  date: string;
  value: number | null;
  display: string;
  field: EditableField;
  disabled?: boolean;
  step?: string;
  onUpdate: () => void;
}

function EditableCell({
  date,
  value,
  display,
  field,
  disabled,
  step = "1",
  onUpdate,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(value != null ? String(value) : "");
    }
  }, [value, editing]);

  const save = useCallback(async () => {
    const trimmed = draft.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && !Number.isFinite(parsed)) return;

    const unchanged =
      (parsed == null && value == null) ||
      (parsed != null && value != null && parsed === value);
    if (unchanged) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/log/${date}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: parsed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      onUpdate();
      setEditing(false);
    } catch {
      setDraft(value != null ? String(value) : "");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [date, draft, field, onUpdate, value]);

  if (disabled) {
    return <span className="text-muted-foreground">{display}</span>;
  }

  if (editing) {
    return (
      <Input
        type="number"
        step={step}
        autoFocus
        disabled={saving}
        className="h-8 w-20 px-2 text-sm tabular-nums"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setDraft(value != null ? String(value) : "");
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "rounded px-1 -mx-1 tabular-nums transition-colors hover:bg-muted",
        value == null && "text-muted-foreground italic"
      )}
      title="Click to edit"
    >
      {value == null ? "Add" : display}
    </button>
  );
}

function BurnedCell({
  date,
  day,
  disabled,
  onUpdate,
}: {
  date: string;
  day: WeekDayMetrics;
  disabled?: boolean;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [activeDraft, setActiveDraft] = useState("");
  const [restingDraft, setRestingDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const display =
    day.caloriesBurned != null
      ? Math.round(day.caloriesBurned).toLocaleString()
      : "—";

  const startEdit = () => {
    setActiveDraft(
      day.activeCalories != null ? String(day.activeCalories) : ""
    );
    setRestingDraft(
      day.restingCalories != null ? String(day.restingCalories) : ""
    );
    setEditing(true);
  };

  const save = async () => {
    const active =
      activeDraft.trim() === "" ? null : Number(activeDraft.trim());
    const resting =
      restingDraft.trim() === "" ? null : Number(restingDraft.trim());
    if (
      (activeDraft.trim() !== "" && !Number.isFinite(active!)) ||
      (restingDraft.trim() !== "" && !Number.isFinite(resting!))
    ) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/log/${date}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active_calories: active,
          resting_calories: resting,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onUpdate();
      setEditing(false);
    } catch {
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (disabled) {
    return <span className="text-muted-foreground">{display}</span>;
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <Input
          type="number"
          placeholder="Active"
          disabled={saving}
          className="h-7 w-24 px-2 text-xs"
          value={activeDraft}
          onChange={(e) => setActiveDraft(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Resting"
          disabled={saving}
          className="h-7 w-24 px-2 text-xs"
          value={restingDraft}
          onChange={(e) => setRestingDraft(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={cn(
        "rounded px-1 -mx-1 tabular-nums transition-colors hover:bg-muted",
        day.caloriesBurned == null && "text-muted-foreground italic"
      )}
      title="Click to edit active + resting"
    >
      {day.caloriesBurned == null ? "Add" : display}
    </button>
  );
}

function fmtWeight(value: number | null): string {
  return value != null ? value.toFixed(1) : "—";
}

function fmtCalories(value: number | null): string {
  return value != null ? Math.round(value).toLocaleString() : "—";
}

function fmtLift(value: number | null): string {
  return value != null ? Math.round(value).toLocaleString() : "—";
}

export function WeeklyDailyMetrics({
  days,
  weekStartDate,
  weekEndDate,
  onUpdate,
}: WeeklyDailyMetricsProps) {
  const weekLabel = `${format(parseISO(weekStartDate), "MMM d")} – ${format(parseISO(weekEndDate), "MMM d")}`;

  if (days.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">This week</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No days to show yet — your cut hasn&apos;t started this week.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">This week</CardTitle>
        <p className="text-xs text-muted-foreground">
          {weekLabel} · tap a value to edit
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Day</th>
              <th className="pb-2 pr-3 font-medium">Weight</th>
              <th className="pb-2 pr-3 font-medium">Consumed</th>
              <th className="pb-2 pr-3 font-medium">Burned</th>
              <th className="pb-2 pr-3 font-medium">Lift vol</th>
              <th className="pb-2 pr-3 font-medium">Run avg wt</th>
              <th className="pb-2 pr-3 font-medium">Run avg in</th>
              <th className="pb-2 pr-3 font-medium">Run avg burn</th>
              <th className="pb-2 font-medium">Run avg lift</th>
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
                <td className="py-2.5 pr-3">
                  <EditableCell
                    date={day.date}
                    value={day.weightLbs}
                    display={fmtWeight(day.weightLbs)}
                    field="weight_lbs"
                    step="0.1"
                    disabled={day.isFuture}
                    onUpdate={onUpdate}
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <EditableCell
                    date={day.date}
                    value={day.caloriesConsumed}
                    display={fmtCalories(day.caloriesConsumed)}
                    field="calories_consumed"
                    disabled={day.isFuture}
                    onUpdate={onUpdate}
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <BurnedCell
                    date={day.date}
                    day={day}
                    disabled={day.isFuture}
                    onUpdate={onUpdate}
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <EditableCell
                    date={day.date}
                    value={day.liftingVolumeLbs}
                    display={fmtLift(day.liftingVolumeLbs)}
                    field="lifting_volume_lbs"
                    disabled={day.isFuture}
                    onUpdate={onUpdate}
                  />
                </td>
                <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
                  {fmtWeight(day.runningAvgWeight)}
                </td>
                <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
                  {fmtCalories(day.runningAvgConsumed)}
                </td>
                <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
                  {fmtCalories(day.runningAvgBurned)}
                </td>
                <td className="py-2.5 tabular-nums text-muted-foreground">
                  {fmtLift(day.runningAvgLiftingVolume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Burned = active + resting · Run avg lift = avg lbs per logged lift day
          (Mon–that day)
        </p>
      </CardContent>
    </Card>
  );
}
